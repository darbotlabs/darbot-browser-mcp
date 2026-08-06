/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { ConfidentialClientApplication, LogLevel, type Configuration } from '@azure/msal-node';

export interface EntraJwtVerifyConfig {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
}

export interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  tid?: string;
  oid?: string;
  roles?: string[];
  scp?: string;
  [key: string]: unknown;
}

// Cache MSAL client instances per tenant/client combination
const msalClientCache = new Map<string, ConfidentialClientApplication>();
const signingKeyCache = new Map<string, { expiresAt: number; keys: EntraSigningKey[] }>();
const signingKeyCacheTtlMs = 60 * 60 * 1000;

interface JWTHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface EntraSigningKey {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

function getMsalClient(config: EntraJwtVerifyConfig): ConfidentialClientApplication {
  const { tenantId, clientId, clientSecret } = config;
  const cacheKey = `${tenantId}:${clientId}`;

  let client = msalClientCache.get(cacheKey);
  if (!client) {
    const msalConfig: Configuration = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret: clientSecret || process.env.AZURE_CLIENT_SECRET || '',
      },
      system: {
        loggerOptions: {
          loggerCallback(loglevel, message, containsPii) {
            if (containsPii || loglevel > LogLevel.Warning)
              return;
            // eslint-disable-next-line no-console
            console.error(`MSAL [${LogLevel[loglevel]}]: ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: process.env.NODE_ENV === 'production' ? LogLevel.Warning : LogLevel.Info,
        },
      },
    };
    client = new ConfidentialClientApplication(msalConfig);
    msalClientCache.set(cacheKey, client);
  }
  return client;
}

/**
 * Decodes JWT payload without verification (for extracting claims after OBO validation)
 */
function decodeJwtPart<T>(encoded: string, label: string): T {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error(`${label} must be a JSON object`);
    return parsed as T;
  } catch (error) {
    throw new Error(`Invalid JWT ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function decodeJwtPayload(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3)
    throw new Error('Invalid JWT format');

  return decodeJwtPart<JWTPayload>(parts[1]!, 'payload');
}

function isEntraSigningKey(value: unknown): value is EntraSigningKey {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kid === 'string'
    && candidate.kty === 'RSA'
    && typeof candidate.n === 'string'
    && typeof candidate.e === 'string';
}

async function loadSigningKeys(tenantId: string, forceRefresh = false): Promise<EntraSigningKey[]> {
  const cached = signingKeyCache.get(tenantId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now())
    return cached.keys;

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`);
  if (!response.ok)
    throw new Error(`Unable to load Entra signing keys (${response.status} ${response.statusText})`);

  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>).keys))
    throw new Error('Entra signing-key response did not contain a keys array');

  const keys = (body as { keys: unknown[] }).keys.filter(isEntraSigningKey);
  if (keys.length === 0)
    throw new Error('Entra signing-key response did not contain usable RSA keys');

  signingKeyCache.set(tenantId, {
    expiresAt: Date.now() + signingKeyCacheTtlMs,
    keys,
  });
  return keys;
}

async function verifyJwtSignature(token: string, tenantId: string): Promise<void> {
  const parts = token.split('.');
  if (parts.length !== 3)
    throw new Error('Invalid JWT format');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart<JWTHeader>(encodedHeader!, 'header');
  if (header.alg !== 'RS256')
    throw new Error(`Unsupported JWT signing algorithm: ${header.alg || 'missing'}`);
  if (!header.kid)
    throw new Error('JWT header is missing a signing key ID');

  let keys = await loadSigningKeys(tenantId);
  let signingKey = keys.find(key => key.kid === header.kid);
  if (!signingKey) {
    keys = await loadSigningKeys(tenantId, true);
    signingKey = keys.find(key => key.kid === header.kid);
  }
  if (!signingKey)
    throw new Error(`No Entra signing key found for kid '${header.kid}'`);

  const publicKey = createPublicKey({
    key: signingKey,
    format: 'jwk',
  });
  const valid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature!, 'base64url')
  );
  if (!valid)
    throw new Error('Invalid JWT signature');
}

function validIssuersForTenant(tenantId: string, payload: JWTPayload): string[] {
  const tokenTenant = tenantId === 'common' || tenantId === 'organizations'
    ? payload.tid
    : tenantId;
  if (!tokenTenant)
    throw new Error('Multi-tenant token is missing the tid claim');
  return [
    `https://login.microsoftonline.com/${tokenTenant}/v2.0`,
    `https://sts.windows.net/${tokenTenant}/`,
  ];
}

/**
 * Validates an Entra ID JWT token cryptographically with Microsoft's JWKS.
 * When a client secret is available, an OBO exchange adds a second validation
 * signal and confirms the app registration can accept the assertion.
 */
export async function verifyEntraJwt(token: string, config: EntraJwtVerifyConfig): Promise<JWTPayload> {
  const { tenantId, clientId, clientSecret } = config;
  if (!tenantId || !clientId)
    throw new Error('Entra JWT validation misconfigured: missing tenantId or clientId');

  await verifyJwtSignature(token, tenantId);
  const payload = decodeJwtPayload(token);

  const validIssuers = validIssuersForTenant(tenantId, payload);
  if (!payload.iss || !validIssuers.includes(payload.iss))
    throw new Error(`Invalid token issuer: ${payload.iss}`);

  // Validate audience
  const validAudiences = [clientId, `api://${clientId}`];
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const hasValidAudience = aud.some(a => a && validAudiences.includes(a));
  if (!hasValidAudience)
    throw new Error(`Invalid token audience: ${payload.aud}`);

  // Validate expiration
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp)
    throw new Error('Token is missing expiration');
  if (payload.exp < now)
    throw new Error('Token has expired');

  if (payload.nbf && payload.nbf > now)
    throw new Error('Token not yet valid');

  // If we have a client secret, validate app registration and assertion via OBO.
  const secret = clientSecret || process.env.AZURE_CLIENT_SECRET;
  if (secret) {
    try {
      const msalClient = getMsalClient({ ...config, clientSecret: secret });
      // Attempt OBO to validate the token - this proves token signature is valid
      // We request the same scope to validate without actually needing a downstream API
      await msalClient.acquireTokenOnBehalfOf({
        oboAssertion: token,
        scopes: [`api://${clientId}/.default`],
      });
    } catch (oboError: any) {
      // AADSTS65001 means the token is valid but user hasn't consented to the scope
      // AADSTS50013 means assertion audience doesn't match - token may be for different app
      // Other errors may indicate invalid token
      const errorCode = oboError?.errorCode || '';
      const errorMessage = oboError?.message || '';

      // These error codes indicate the token itself is valid, just scope/consent issues
      const validTokenErrors = ['AADSTS65001', 'AADSTS50013', 'AADSTS700024'];
      const isValidTokenError = validTokenErrors.some(code =>
        errorCode.includes(code) || errorMessage.includes(code)
      );

      if (!isValidTokenError) {
        // Token is actually invalid
        throw new Error(`Token validation failed: ${errorMessage}`);
      }
      // Token is valid, just can't do OBO for scope reasons - that's OK
    }
  }

  return payload;
}
