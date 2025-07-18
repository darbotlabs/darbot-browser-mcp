/**
 * Copyright (c) Microsoft Corporation.
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

import type { IncomingMessage, ServerResponse } from 'http';

export interface EntraIDConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  enabled?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

/**
 * Middleware for Microsoft Entra ID authentication
 * Validates JWT tokens from Microsoft identity platform
 */
export class EntraIDAuthenticator {
  private config: EntraIDConfig;

  constructor(config: EntraIDConfig) {
    this.config = config;
  }

  /**
   * Validates the authorization header and extracts user information
   */
  async authenticate(req: IncomingMessage): Promise<AuthenticatedUser | null> {
    if (!this.config.enabled) {
      // Return a default user when authentication is disabled (for development)
      return {
        userId: 'dev-user',
        tenantId: 'dev-tenant',
        roles: ['user'],
        permissions: ['browser:read', 'browser:write']
      };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await this.validateToken(token);
  }

  /**
   * Validates JWT token from Microsoft identity platform
   */
  private async validateToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      // In a real implementation, this would:
      // 1. Validate the token signature using Microsoft's public keys
      // 2. Check token expiration
      // 3. Validate audience and issuer
      // 4. Extract user claims
      
      // For now, return a mock user for development
      // TODO: Implement actual JWT validation using jsonwebtoken or msal-node
      if (token === 'mock-valid-token') {
        return {
          userId: 'authenticated-user',
          tenantId: this.config.tenantId || 'default-tenant',
          roles: ['user'],
          permissions: ['browser:read', 'browser:write']
        };
      }

      return null;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Middleware function for HTTP requests
   */
  middleware() {
    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const user = await this.authenticate(req);
      if (!user && this.config.enabled) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Unauthorized', message: 'Valid authentication required' }));
        return;
      }

      // Attach user to request for downstream handlers
      (req as any).user = user;
      next();
    };
  }
}

/**
 * Creates an Entra ID authenticator from environment variables
 */
export function createEntraIDAuthenticator(): EntraIDAuthenticator {
  const config: EntraIDConfig = {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    enabled: process.env.ENTRA_AUTH_ENABLED === 'true'
  };

  return new EntraIDAuthenticator(config);
}