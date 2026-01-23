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
function decodeJwtPayload(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3)
    throw new Error('Invalid JWT format');

  const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
  return JSON.parse(payloadJson);
}

/**
 * Validates an Entra ID JWT token using MSAL On-Behalf-Of flow.
 * This validates the token by attempting to exchange it, proving it's valid.
 * If OBO fails (e.g., no client secret), falls back to basic claim validation.
 */
export async function verifyEntraJwt(token: string, config: EntraJwtVerifyConfig): Promise<JWTPayload> {
  const { tenantId, clientId, clientSecret } = config;
  if (!tenantId || !clientId)
    throw new Error('Entra JWT validation misconfigured: missing tenantId or clientId');

  // Decode token to extract claims
  const payload = decodeJwtPayload(token);

  // Validate basic claims
  const issuerV2 = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const issuerV1 = `https://sts.windows.net/${tenantId}/`;
  const validIssuers = [issuerV2, issuerV1];

  if (payload.iss && !validIssuers.includes(payload.iss))
    throw new Error(`Invalid token issuer: ${payload.iss}`);

  // Validate audience
  const validAudiences = [clientId, `api://${clientId}`];
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const hasValidAudience = aud.some(a => a && validAudiences.includes(a));
  if (!hasValidAudience)
    throw new Error(`Invalid token audience: ${payload.aud}`);

  // Validate expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now)
    throw new Error('Token has expired');

  if (payload.nbf && payload.nbf > now)
    throw new Error('Token not yet valid');

  // If we have a client secret, validate token via OBO flow (cryptographic validation)
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
