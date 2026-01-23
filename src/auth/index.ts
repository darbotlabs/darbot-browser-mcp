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
 * Unified Authentication Module
 *
 * Provides a single entry point for all authentication methods:
 * - Azure Managed Identity (no API key needed)
 * - Entra ID RBAC (role-based access control)
 * - VS Code Dev Tunnel (GitHub-based auth)
 * - OAuth 2.0 (for MCP clients like VS Code)
 * - API Key (legacy support)
 *
 * Priority order (first successful auth wins):
 * 1. Dev Tunnel (if request comes through tunnel)
 * 2. Managed Identity (for Azure services)
 * 3. OAuth Bearer token (Entra ID)
 * 4. API Key (if enabled)
 */

import type { IncomingMessage, ServerResponse } from 'http';

import { EntraIDAuthenticator, createEntraIDAuthenticator, type AuthenticatedUser } from './entraAuth.js';
import { ApiKeyAuthenticator, createApiKeyAuthenticatorFromEnv } from './apiKeyAuth.js';
import { DevTunnelAuthenticator, createDevTunnelAuthenticator, type TunnelAuthResult } from './tunnelAuth.js';
import {
  initializeManagedIdentityAuth,
  createManagedIdentityConfig,
  type ManagedIdentityConfig,
} from './managedIdentityAuth.js';

export interface UnifiedAuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** The authentication method used */
  method: 'tunnel' | 'managed-identity' | 'entra' | 'api-key' | 'anonymous' | 'none';
  /** User information (if available) */
  user?: AuthenticatedUser;
  /** Tunnel information (if authenticated via tunnel) */
  tunnel?: TunnelAuthResult;
  /** Error message if failed */
  error?: string;
}

export interface UnifiedAuthConfig {
  /** Allow anonymous access (no auth required) */
  allowAnonymous: boolean;
  /** Enable API key authentication */
  enableApiKey: boolean;
  /** Enable Entra ID authentication */
  enableEntra: boolean;
  /** Enable tunnel authentication */
  enableTunnel: boolean;
  /** Enable Managed Identity */
  enableManagedIdentity: boolean;
  /** RBAC roles required for access */
  requiredRoles?: string[];
}

/**
 * Unified Authenticator that combines all auth methods
 */
export class UnifiedAuthenticator {
  private config: UnifiedAuthConfig;
  private entraAuth: EntraIDAuthenticator;
  private apiKeyAuth: ApiKeyAuthenticator;
  private tunnelAuth: DevTunnelAuthenticator;
  private managedIdentityConfig: ManagedIdentityConfig;
  private managedIdentityInitialized = false;

  constructor(config?: Partial<UnifiedAuthConfig>) {
    // Build configuration from environment and overrides
    this.config = {
      allowAnonymous: process.env.ALLOW_ANONYMOUS_ACCESS === 'true',
      enableApiKey: process.env.API_KEY_AUTH_ENABLED === 'true',
      enableEntra: process.env.ENTRA_AUTH_ENABLED === 'true',
      enableTunnel: process.env.TUNNEL_AUTH_ENABLED === 'true' ||
                   !!process.env.TUNNEL_URL ||
                   !!process.env.CODESPACE_NAME,
      enableManagedIdentity: process.env.MANAGED_IDENTITY_ENABLED === 'true' ||
                            process.env.AZURE_USE_MANAGED_IDENTITY === 'true' ||
                            !!process.env.IDENTITY_ENDPOINT,
      requiredRoles: process.env.REQUIRED_ROLES?.split(',').map(r => r.trim()),
      ...config,
    };

    this.entraAuth = createEntraIDAuthenticator();
    this.apiKeyAuth = createApiKeyAuthenticatorFromEnv();
    this.tunnelAuth = createDevTunnelAuthenticator();
    this.managedIdentityConfig = createManagedIdentityConfig();
  }

  /**
   * Initialize async authentication providers
   */
  async initialize(): Promise<void> {
    // Initialize Managed Identity if enabled
    if (this.config.enableManagedIdentity && !this.managedIdentityInitialized) {
      this.managedIdentityInitialized = await initializeManagedIdentityAuth();
      if (this.managedIdentityInitialized) {
        // Reload Entra auth with secrets from Key Vault
        this.entraAuth = createEntraIDAuthenticator();
      }
    }
  }

  /**
   * Check if any authentication is enabled
   */
  isAuthEnabled(): boolean {
    return this.config.enableApiKey ||
           this.config.enableEntra ||
           this.config.enableTunnel ||
           this.config.enableManagedIdentity;
  }

  /**
   * Check if a user has the required roles
   */
  private hasRequiredRoles(user: AuthenticatedUser): boolean {
    if (!this.config.requiredRoles || this.config.requiredRoles.length === 0)
      return true;

    return this.config.requiredRoles.some(role => user.roles.includes(role));
  }

  /**
   * Authenticate a request using all available methods
   */
  async authenticate(req: IncomingMessage): Promise<UnifiedAuthResult> {
    // If no auth is enabled and anonymous access is allowed
    if (!this.isAuthEnabled() || this.config.allowAnonymous) {
      return {
        authenticated: true,
        method: 'anonymous',
      };
    }

    // 1. Check dev tunnel first (highest priority - trusted transport)
    if (this.config.enableTunnel && this.tunnelAuth.isTunnelRequest(req)) {
      const tunnelResult = await this.tunnelAuth.authenticate(req);
      if (tunnelResult.authenticated) {
        return {
          authenticated: true,
          method: 'tunnel',
          tunnel: tunnelResult,
          user: {
            userId: tunnelResult.githubUser || 'tunnel-user',
            tenantId: 'github',
            roles: ['user'],
            permissions: ['browser:read', 'browser:write'],
          },
        };
      }
    }

    // 2. Check Entra ID Bearer token
    if (this.config.enableEntra) {
      const user = await this.entraAuth.authenticate(req);
      if (user) {
        // Check RBAC roles if configured
        if (!this.hasRequiredRoles(user)) {
          return {
            authenticated: false,
            method: 'none',
            error: 'Insufficient permissions. Required roles: ' + this.config.requiredRoles?.join(', '),
          };
        }
        return {
          authenticated: true,
          method: 'entra',
          user,
        };
      }
    }

    // 3. Check API Key (legacy)
    if (this.config.enableApiKey && this.apiKeyAuth.authenticate(req)) {
      return {
        authenticated: true,
        method: 'api-key',
        user: {
          userId: 'api-key-user',
          tenantId: 'local',
          roles: ['user'],
          permissions: ['browser:read', 'browser:write'],
        },
      };
    }

    // 4. Check Managed Identity context
    // This is for Azure-to-Azure calls where the caller is another Azure service
    if (this.config.enableManagedIdentity && this.managedIdentityInitialized) {
      // For Azure service-to-service, the token would come in the Bearer header
      // and be validated through the Entra flow above. This is a fallback
      // for when we're making outbound calls.
      return {
        authenticated: false,
        method: 'none',
        error: 'Managed Identity is configured but no valid token provided',
      };
    }

    return {
      authenticated: false,
      method: 'none',
      error: 'No valid authentication provided',
    };
  }

  /**
   * Express-style middleware
   */
  middleware() {
    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const result = await this.authenticate(req);

      if (!result.authenticated) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'unauthorized',
          message: result.error || 'Authentication required',
          methods_available: this.getAvailableMethods(),
        }));
        return;
      }

      // Attach auth result to request
      (req as any).auth = result;
      (req as any).user = result.user;
      next();
    };
  }

  /**
   * Get list of available authentication methods
   */
  private getAvailableMethods(): string[] {
    const methods: string[] = [];
    if (this.config.enableTunnel)
      methods.push('VS Code Dev Tunnel');
    if (this.config.enableEntra)
      methods.push('Entra ID Bearer Token');
    if (this.config.enableApiKey)
      methods.push('API Key (X-API-Key header)');
    if (this.config.enableManagedIdentity)
      methods.push('Azure Managed Identity');
    if (this.config.allowAnonymous)
      methods.push('Anonymous');
    return methods;
  }
}

/**
 * Create a unified authenticator from environment
 */
export function createUnifiedAuthenticator(config?: Partial<UnifiedAuthConfig>): UnifiedAuthenticator {
  return new UnifiedAuthenticator(config);
}

// Re-export all auth modules
export * from './entraAuth.js';
export * from './apiKeyAuth.js';
export * from './tunnelAuth.js';
export * from './managedIdentityAuth.js';
export * from './mcpOAuthProvider.js';
export * from './entraJwtVerifier.js';
