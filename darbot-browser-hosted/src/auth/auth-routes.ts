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
 * MSAL Authentication Routes
 *
 * Handles OAuth 2.0 authorization code flow with Microsoft Entra ID
 */

import express, { Request, Response, Router } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import debug from 'debug';
import { msalConfig, authCodeUrlParameters, getRedirectUri } from './msal-config.js';

const log = debug('darbot:auth');
const logError = debug('darbot:auth:error');

const router: Router = express.Router();

// Create MSAL client
const msalClient = new ConfidentialClientApplication(msalConfig);

/**
 * GET /auth/login
 * Initiates the authorization code flow
 */
router.get('/login', async (req: Request, res: Response) => {
  try {
    // Update redirect URI to support dev tunnel
    const params = {
      ...authCodeUrlParameters,
      redirectUri: getRedirectUri(),
    };

    // Get authorization code URL
    const authCodeUrl = await msalClient.getAuthCodeUrl(params);

    log('Redirecting to Microsoft login:', authCodeUrl);
    res.redirect(authCodeUrl);
  } catch (error) {
    logError('Login error:', error);
    res.status(500).json({
      error: 'authentication_error',
      message: 'Failed to initiate login',
    });
  }
});

/**
 * GET /auth/callback
 * Handles the OAuth callback from Microsoft
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;

  // Check for errors
  if (error) {
    logError('Callback error:', error, error_description);
    return res.status(400).json({
      error,
      message: error_description || 'Authentication failed',
    });
  }

  // Validate authorization code
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Authorization code not provided',
    });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: authCodeUrlParameters.scopes,
      redirectUri: getRedirectUri(),
    });

    if (!tokenResponse)
      throw new Error('No token response received');


    log('Token acquired successfully for:', tokenResponse.account?.username);

    // Store token in session (or return to client)
    // For MCP usage, return token to client for bearer authentication
    res.json({
      success: true,
      accessToken: tokenResponse.accessToken,
      expiresOn: tokenResponse.expiresOn,
      user: {
        id: tokenResponse.account?.homeAccountId,
        email: tokenResponse.account?.username,
        name: tokenResponse.account?.name,
        tenantId: tokenResponse.account?.tenantId,
      },
      message: 'Authentication successful. Use the accessToken as Bearer token for MCP requests.',
    });
  } catch (error) {
    logError('Token acquisition error:', error);
    res.status(500).json({
      error: 'token_error',
      message: 'Failed to acquire access token',
    });
  }
});

/**
 * GET /auth/logout
 * Logs out the user and clears session
 */
router.get('/logout', (req: Request, res: Response) => {
  // In a full implementation, clear session and invalidate tokens
  const logoutUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(process.env.SERVER_BASE_URL || 'http://localhost:8080')}`;

  log('User logged out');
  res.redirect(logoutUrl);
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      authenticated: false,
      message: 'No token provided',
    });
  }

  // In production, validate the token here
  res.json({
    authenticated: true,
    message: 'Token present (validation not implemented in this endpoint)',
  });
});

export default router;
