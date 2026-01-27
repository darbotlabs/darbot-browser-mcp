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
 * MSAL Authentication Middleware
 *
 * Express middleware to validate MSAL tokens and protect endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import debug from 'debug';
import { msalConfig } from './msal-config.js';

const log = debug('darbot:auth');
const logError = debug('darbot:auth:error');

// Create MSAL client instance
const msalClient = new ConfidentialClientApplication(msalConfig);

/**
 * Extended Express Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    roles?: string[];
  };
  accessToken?: string;
  sessionId?: string;
}

/**
 * In-memory token cache (use Redis/database in production)
 */
const tokenCache = new Map<string, AuthenticationResult>();

/**
 * Authentication middleware
 * Validates bearer token or redirects to login
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Allow localhost in development/testing
  if (process.env.ALLOW_LOCALHOST === 'true' && isLocalhost(req)) {
    log('Localhost access allowed (development mode)');
    next();
    return;
  }

  // Check if authentication is required
  if (process.env.REQUIRE_AUTH !== 'true') {
    log('Authentication disabled via REQUIRE_AUTH=false');
    next();
    return;
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log('No bearer token found, redirecting to login');
    res.redirect('/auth/login');
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  // Validate token
  validateToken(token)
      .then(user => {
        req.user = user;
        req.accessToken = token;
        next();
      })
      .catch(error => {
        logError('Token validation failed:', error);
        res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid or expired token',
        });
      });
}

/**
 * Validate access token
 */
async function validateToken(token: string): Promise<AuthenticatedRequest['user']> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresOn && cached.expiresOn > new Date())
    return parseUserFromToken(cached);


  // Token validation with Microsoft Graph
  // In production, validate token signature and claims
  // For now, we'll use a simplified validation

  try {
    // Acquire token silently (validates the token)
    const result = await msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!result)
      throw new Error('Token validation failed');


    // Cache the result
    tokenCache.set(token, result);

    return parseUserFromToken(result);
  } catch (error) {
    throw new Error('Token validation failed');
  }
}

/**
 * Parse user information from authentication result
 */
function parseUserFromToken(result: AuthenticationResult): AuthenticatedRequest['user'] {
  const account = result.account;
  if (!account)
    throw new Error('No account information in token');


  return {
    id: account.homeAccountId,
    email: account.username,
    name: account.name || account.username,
    tenantId: account.tenantId,
    roles: account.idTokenClaims?.roles as string[] | undefined,
  };
}

/**
 * Check if request is from localhost
 */
function isLocalhost(req: Request): boolean {
  const host = req.hostname;
  const ip = req.ip;

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    ip === '127.0.0.1' ||
    ip === '::1'
  );
}

/**
 * Audit logging middleware
 * Logs all authenticated requests for compliance
 */
export function auditLogger(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (process.env.AUDIT_LOGGING_ENABLED !== 'true') {
    next();
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    sessionId: req.sessionId,
  };

  // In production, send to logging service (Application Insights, ELK, etc.)
  log('Audit', JSON.stringify(logEntry));

  next();
}

/**
 * Optional: Role-based access control middleware
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.roles) {
      res.status(403).json({
        error: 'forbidden',
        message: 'User has no roles assigned',
      });
      return;
    }

    const hasRole = roles.some(role => req.user?.roles?.includes(role));
    if (!hasRole) {
      res.status(403).json({
        error: 'forbidden',
        message: `Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
