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
 * 
 * Supports Dynamic Client Registration (RFC 7591) for VS Code compatibility.
 */

import crypto from 'node:crypto';
import { ProxyOAuthServerProvider, type ProxyOptions, type ProxyEndpoints } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { verifyEntraJwt, type JWTPayload } from './entraJwtVerifier.js';

export interface EntraOAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /**
   * The base URL of this MCP server (e.g., https://<your-app>.azurewebsites.net)
   * Set via SERVER_BASE_URL environment variable
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
    // We handle dynamic client registration ourselves
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
        // Azure AD redirect
        `${config.serverBaseUrl}/auth/callback`,
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
  const serverBaseUrl = process.env.SERVER_BASE_URL;

  if (!tenantId || !clientId || !clientSecret || !serverBaseUrl) {
    return null;
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    serverBaseUrl,
  };
}
