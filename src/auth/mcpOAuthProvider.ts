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
 * This implements the MCP OAuth protocol by proxying to Microsoft Entra ID,
 * enabling VS Code's MCP client to authenticate users through standard OAuth flow.
 */

import { ProxyOAuthServerProvider, type ProxyOptions, type ProxyEndpoints } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { verifyEntraJwt, type JWTPayload } from './entraJwtVerifier.js';

export interface EntraOAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /**
   * The base URL of this MCP server (e.g., https://darbot-browser-mcp.azurewebsites.net)
   */
  serverBaseUrl: string;
}

/**
 * Get Entra ID OAuth endpoints for a given tenant
 */
function getEntraEndpoints(tenantId: string): ProxyEndpoints {
  const authority = `https://login.microsoftonline.com/${tenantId}`;
  return {
    authorizationUrl: `${authority}/oauth2/v2.0/authorize`,
    tokenUrl: `${authority}/oauth2/v2.0/token`,
    // Entra doesn't support dynamic client registration at the standard endpoint
    // but we handle pre-registered clients
    registrationUrl: undefined,
    // Entra doesn't have a standard revocation endpoint
    revocationUrl: undefined,
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

  return {
    token,
    clientId: config.clientId,
    scopes: payload.scp?.split(' ') || [],
    expiresAt: payload.exp ? payload.exp * 1000 : undefined,
    // Additional user info from token
    extra: {
      sub: payload.sub,
      oid: payload.oid,
      tid: payload.tid,
      roles: payload.roles,
    },
  };
}

/**
 * Pre-registered OAuth clients that are allowed to connect.
 * This includes VS Code's MCP client identifiers.
 */
const REGISTERED_CLIENTS: Map<string, OAuthClientInformationFull> = new Map();

/**
 * Register the Azure AD app as a known client
 */
function registerEntraClient(config: EntraOAuthConfig): void {
  // Register our own Azure AD app as a client
  REGISTERED_CLIENTS.set(config.clientId, {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uris: [
      // VS Code localhost redirect (VS Code picks a random port)
      'http://127.0.0.1/callback',
      // VS Code web redirect
      'https://vscode.dev/redirect',
      // Azure AD redirect (for our own callback)
      `${config.serverBaseUrl}/auth/callback`,
    ],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_basic',
    client_name: 'Darbot Browser MCP',
    scope: 'openid profile email User.Read',
    client_id_issued_at: Math.floor(Date.now() / 1000),
  });
}

/**
 * Get a registered client by ID
 */
async function getRegisteredClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
  return REGISTERED_CLIENTS.get(clientId);
}

/**
 * Create an MCP OAuth provider that proxies to Entra ID
 */
export function createMcpOAuthProvider(config: EntraOAuthConfig): ProxyOAuthServerProvider {
  // Register the Entra client
  registerEntraClient(config);

  const endpoints = getEntraEndpoints(config.tenantId);

  const options: ProxyOptions = {
    endpoints,
    verifyAccessToken: async (token: string) => verifyEntraToken(token, config),
    getClient: getRegisteredClient,
  };

  const provider = new ProxyOAuthServerProvider(options);

  // Skip local PKCE validation since Entra handles it
  provider.skipLocalPkceValidation = true;

  return provider;
}

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
}

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfig(): EntraOAuthConfig | null {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const serverBaseUrl = process.env.SERVER_BASE_URL || 'https://darbot-browser-mcp.azurewebsites.net';

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    serverBaseUrl,
  };
}
