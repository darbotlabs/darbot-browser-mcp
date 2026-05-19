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

/**
 * MCP OAuth Provider using Entra ID as the upstream authorization server.
 *
 * Implements the MCP OAuth protocol by proxying to Microsoft Entra ID,
 * enabling VS Code's MCP client to authenticate users through standard OAuth flow.
 *
 * Supports Dynamic Client Registration (RFC 7591) for VS Code compatibility.
 *
 * ## Environment variable contract
 *
 * All four of the following variables must be present for OAuth to activate.
 * Missing any one causes {@link getOAuthConfig} to return `null` (fail-closed)
 * and a single `OAUTH_CONFIG_INCOMPLETE` warning to be emitted.
 *
 * | Variable              | Description                                                        |
 * | --------------------- | ------------------------------------------------------------------ |
 * | `AZURE_TENANT_ID`     | Entra ID tenant GUID, or one of `common` / `organizations`.        |
 * | `AZURE_CLIENT_ID`     | Application (client) ID of the Entra ID app registration.          |
 * | `AZURE_CLIENT_SECRET` | Client secret for the Entra ID app registration.                   |
 * | `SERVER_BASE_URL`     | Absolute https URL where this MCP server is reachable.             |
 *
 * Consumers (e.g. `src/health.ts`, `src/transport.ts`) should call
 * {@link validateOAuthConfig} to inspect configuration completeness without
 * triggering the warning, and {@link getOAuthConfig} to obtain the parsed
 * config when ready to wire the provider.
 */

import crypto from 'node:crypto';
import { ProxyOAuthServerProvider, type ProxyOptions, type ProxyEndpoints } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { verifyEntraJwt, type JWTPayload } from './entraJwtVerifier.js';

/**
 * Strongly-typed Entra ID OAuth configuration.
 *
 * `serverBaseUrl` is modelled as a {@link URL} to ensure callers never pass
 * a non-absolute string and to make path joining (`new URL('/auth/callback', base)`)
 * type-safe.
 */
export interface EntraOAuthConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  /**
   * Absolute base URL of this MCP server, e.g. `https://my-mcp.azurewebsites.net`.
   * Sourced from the `SERVER_BASE_URL` environment variable.
   */
  readonly serverBaseUrl: URL;
}

/** Result of {@link validateOAuthConfig}. */
export interface OAuthConfigValidation {
  /** True iff every required env var is present and `SERVER_BASE_URL` parses as a URL. */
  ok: boolean;
  /** Names of the missing or invalid environment variables (empty when `ok` is true). */
  missing: string[];
}

/** Required environment variable names, in declaration order. */
const REQUIRED_OAUTH_ENV_VARS = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'SERVER_BASE_URL',
] as const;

/**
 * Get Entra ID OAuth endpoints for a given tenant
 */
function getEntraEndpoints(tenantId: string): ProxyEndpoints {
  const authority = `https://login.microsoftonline.com/${tenantId}`;
  return {
    authorizationUrl: `${authority}/oauth2/v2.0/authorize`,
    tokenUrl: `${authority}/oauth2/v2.0/token`,
    // We handle dynamic client registration ourselves; Entra has no standard
    // revocation endpoint either. Omit both rather than set them to undefined.
  };
}

/**
 * Verify an Entra ID access token and return AuthInfo
 */
async function verifyEntraToken(
  token: string,
  config: EntraOAuthConfig
): Promise<AuthInfo> {
  const payload: JWTPayload = await verifyEntraJwt(token, {
    tenantId: config.tenantId,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  const extra: { sub?: string; oid?: string; tid?: string; roles?: string[] } = {};
  if (payload.sub !== undefined) extra.sub = payload.sub;
  if (payload.oid !== undefined) extra.oid = payload.oid;
  if (payload.tid !== undefined) extra.tid = payload.tid;
  if (payload.roles !== undefined) extra.roles = payload.roles;

  return {
    token,
    clientId: config.clientId,
    scopes: payload.scp?.split(' ') || [],
    ...(payload.exp !== undefined && { expiresAt: payload.exp * 1000 }),
    // Additional user info from token
    extra,
  };
}

/**
 * In-memory OAuth clients store with dynamic registration support.
 * This allows VS Code's MCP client to register automatically.
 */
class DynamicClientsStore implements OAuthRegisteredClientsStore {
  private clients: Map<string, OAuthClientInformationFull> = new Map();
  private config: EntraOAuthConfig;

  constructor(config: EntraOAuthConfig) {
    this.config = config;
    // Pre-register our own Azure AD app as a known client
    this.registerStaticClient(config);
  }

  /**
   * Register the main Azure AD app as a static client
   */
  private registerStaticClient(config: EntraOAuthConfig): void {
    this.clients.set(config.clientId, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uris: [
        // VS Code localhost redirect (accepts any port)
        'http://127.0.0.1/callback',
        // VS Code web redirect
        'https://vscode.dev/redirect',
        // Azure AD redirect (resolved against the base URL so trailing slashes don't double up)
        new URL('/auth/callback', config.serverBaseUrl).toString(),
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      client_name: 'Darbot Browser MCP',
      scope: 'openid profile email User.Read',
      client_id_issued_at: Math.floor(Date.now() / 1000),
    });
  }

  /**
   * Get a registered client by ID
   */
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.clients.get(clientId);
  }

  /**
   * Dynamic Client Registration (RFC 7591)
   * VS Code's MCP client will call this to register itself automatically.
   * We create a client that proxies to our Entra ID app.
   */
  async registerClient(
    clientMetadata: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
  ): Promise<OAuthClientInformationFull> {
    // Generate a unique client ID for this dynamically registered client
    const clientId = `vscode-mcp-${crypto.randomUUID()}`;
    const clientIdIssuedAt = Math.floor(Date.now() / 1000);

    // For dynamically registered clients, we use our Entra app's credentials
    // This is safe because the OAuth flow still goes through Entra ID validation
    const registeredClient: OAuthClientInformationFull = {
      ...clientMetadata,
      client_id: clientId,
      client_id_issued_at: clientIdIssuedAt,
      // Use our Entra app's secret - this allows the proxy to work
      client_secret: this.config.clientSecret,
      // Ensure proper redirect URIs are set
      redirect_uris: clientMetadata.redirect_uris || [
        'http://127.0.0.1/callback',
        'https://vscode.dev/redirect',
      ],
      // Set default grant types if not provided
      grant_types: clientMetadata.grant_types || ['authorization_code', 'refresh_token'],
      response_types: clientMetadata.response_types || ['code'],
      token_endpoint_auth_method: clientMetadata.token_endpoint_auth_method || 'client_secret_post',
    };

    this.clients.set(clientId, registeredClient);

    // eslint-disable-next-line no-console
    console.error(`[OAuth] Dynamic client registered: ${clientId} (${clientMetadata.client_name || 'unnamed'})`);

    return registeredClient;
  }
}

/**
 * Create an MCP OAuth provider that proxies to Entra ID
 * with support for Dynamic Client Registration
 */
export function createMcpOAuthProvider(config: EntraOAuthConfig): ProxyOAuthServerProvider {
  const endpoints = getEntraEndpoints(config.tenantId);
  const clientsStore = new DynamicClientsStore(config);

  const options: ProxyOptions = {
    endpoints,
    verifyAccessToken: async (token: string) => verifyEntraToken(token, config),
    getClient: async (clientId: string) => clientsStore.getClient(clientId),
  };

  const provider = new ProxyOAuthServerProvider(options);

  // Override the clientsStore to enable dynamic registration
  // The SDK checks clientsStore.registerClient to determine if registration is supported
  Object.defineProperty(provider, 'clientsStore', {
    get: () => clientsStore,
    configurable: true,
  });

  // Skip local PKCE validation since Entra handles it
  provider.skipLocalPkceValidation = true;

  return provider;
}

/**
 * Check if OAuth is fully configured (all required env vars present).
 *
 * Prefer {@link validateOAuthConfig} when you need to know *which* vars are
 * missing (e.g. for health endpoints or startup diagnostics).
 */
export function isOAuthConfigured(): boolean {
  return validateOAuthConfig().ok;
}

/**
 * Inspect OAuth configuration completeness without side effects.
 *
 * Reports every required env var that is missing, so callers like
 * `src/health.ts` can surface actionable error messages instead of opaque
 * "OAuth not configured" booleans.
 *
 * @example
 * const v = validateOAuthConfig();
 * if (!v.ok) console.warn('OAuth disabled. Missing:', v.missing.join(', '));
 */
export function validateOAuthConfig(): OAuthConfigValidation {
  const missing: string[] = [];
  for (const name of REQUIRED_OAUTH_ENV_VARS) {
    if (!process.env[name])
      missing.push(name);
  }

  // Even when SERVER_BASE_URL is set, reject malformed values up front so we
  // don't pass an invalid URL into the rest of the OAuth pipeline.
  if (!missing.includes('SERVER_BASE_URL')) {
    try {
      // Constructed solely to validate parseability; result is discarded.
      void new URL(process.env.SERVER_BASE_URL!);
    } catch {
      missing.push('SERVER_BASE_URL (invalid URL)');
    }
  }

  return { ok: missing.length === 0, missing };
}

// Guard against log spam: warn at most once per process about partial config.
let oauthIncompleteWarningEmitted = false;

/**
 * Get OAuth configuration from environment, returning `null` when any
 * required variable is missing (fail-closed).
 *
 * On the *first* call where partial config is detected (one or more env vars
 * set but at least one missing), logs a single `OAUTH_CONFIG_INCOMPLETE`
 * warning naming the missing variables. Subsequent calls return `null`
 * silently to avoid log flooding.
 *
 * @returns A frozen {@link EntraOAuthConfig} or `null` when not fully configured.
 *
 * @example
 * const cfg = getOAuthConfig();
 * if (cfg) {
 *   const provider = createMcpOAuthProvider(cfg);
 * }
 */
export function getOAuthConfig(): EntraOAuthConfig | null {
  const validation = validateOAuthConfig();
  if (!validation.ok) {
    const anyPresent = REQUIRED_OAUTH_ENV_VARS.some(name => process.env[name]);
    if (anyPresent && !oauthIncompleteWarningEmitted) {
      oauthIncompleteWarningEmitted = true;
      // eslint-disable-next-line no-console
      console.warn(
          `[OAuth] OAUTH_CONFIG_INCOMPLETE: OAuth disabled because the following env ` +
          `var(s) are missing or invalid: ${validation.missing.join(', ')}. ` +
          `Set all of ${REQUIRED_OAUTH_ENV_VARS.join(', ')} to enable Entra-backed auth.`
      );
    }
    return null;
  }

  return Object.freeze({
    tenantId: process.env.AZURE_TENANT_ID!,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    serverBaseUrl: new URL(process.env.SERVER_BASE_URL!),
  });
}
