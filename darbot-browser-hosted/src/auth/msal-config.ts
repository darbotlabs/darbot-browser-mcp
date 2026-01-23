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
 * MSAL (Microsoft Authentication Library) Configuration
 *
 * Configures authentication with Microsoft Entra ID (Azure AD)
 * for on-premises hosted deployment.
 */

import { Configuration, LogLevel } from '@azure/msal-node';
import debug from 'debug';

const log = debug('darbot:auth:msal');
const logError = debug('darbot:auth:msal:error');

/**
 * MSAL configuration for confidential client application
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  },
  cache: {
    cachePlugin: undefined, // Can implement persistent cache if needed
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (containsPii)
          return;

        switch (loglevel) {
          case LogLevel.Error:
            logError(message);
            return;
          case LogLevel.Info:
            log(message);
            return;
          case LogLevel.Verbose:
            log(message);
            return;
          case LogLevel.Warning:
            log(message);
            return;
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'production' ? LogLevel.Warning : LogLevel.Info,
    },
  },
};

/**
 * Scopes requested for the access token
 */
export const tokenRequest = {
  scopes: ['User.Read'],
};

/**
 * Authorization request configuration
 */
export const authCodeUrlParameters = {
  scopes: ['User.Read'],
  redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:8080/auth/callback',
};

/**
 * Validate MSAL configuration
 */
export function validateMsalConfig(): void {
  const required = [
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
        `Missing required MSAL configuration: ${missing.join(', ')}\n` +
      'Please set these environment variables in your .env file or docker-compose.yml'
    );
  }
}

/**
 * Get redirect URI with support for dev tunnel
 */
export function getRedirectUri(): string {
  // Check if running behind dev tunnel
  const tunnelUrl = process.env.TUNNEL_URL;
  if (tunnelUrl)
    return `${tunnelUrl}/auth/callback`;


  // Use configured redirect URI or default to localhost
  return process.env.AZURE_REDIRECT_URI || 'http://localhost:8080/auth/callback';
}
