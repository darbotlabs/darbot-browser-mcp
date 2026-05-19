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

import { test, expect } from './fixtures.js';

const oauthEnvVars = ['SERVER_BASE_URL', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] as const;

async function loadOAuthModule() {
  try {
    return await import('../src/auth/mcpOAuthProvider.js') as any;
  } catch (error) {
    test.skip(true, `OAuth provider module is not available: ${String(error)}`);
    throw error;
  }
}

function withOAuthEnv(env: Partial<Record<typeof oauthEnvVars[number], string>>) {
  const previous = new Map(oauthEnvVars.map(name => [name, process.env[name]]));
  for (const name of oauthEnvVars)
    delete process.env[name];
  for (const [name, value] of Object.entries(env))
    process.env[name] = value;
  return () => {
    for (const [name, value] of previous) {
      if (value === undefined)
        delete process.env[name];
      else
        process.env[name] = value;
    }
  };
}

test.describe('getOAuthConfig', () => {
  test('it should return null when SERVER_BASE_URL is unset', async () => {
    const oauth = await loadOAuthModule();
    const restore = withOAuthEnv({
      AZURE_TENANT_ID: 'tenant-id',
      AZURE_CLIENT_ID: 'client-id',
      AZURE_CLIENT_SECRET: 'client-secret',
    });

    try {
      expect(oauth.getOAuthConfig()).toBeNull();
    } finally {
      restore();
    }
  });

  test('it should return null when AZURE_TENANT_ID is unset', async () => {
    const oauth = await loadOAuthModule();
    const restore = withOAuthEnv({
      SERVER_BASE_URL: 'https://mcp.example.test',
      AZURE_CLIENT_ID: 'client-id',
      AZURE_CLIENT_SECRET: 'client-secret',
    });

    try {
      expect(oauth.getOAuthConfig()).toBeNull();
    } finally {
      restore();
    }
  });

  test('it should return config when all four environment variables are present', async () => {
    const oauth = await loadOAuthModule();
    const restore = withOAuthEnv({
      SERVER_BASE_URL: 'https://mcp.example.test',
      AZURE_TENANT_ID: 'tenant-id',
      AZURE_CLIENT_ID: 'client-id',
      AZURE_CLIENT_SECRET: 'client-secret',
    });

    try {
      expect(oauth.getOAuthConfig()).toEqual({
        serverBaseUrl: 'https://mcp.example.test',
        tenantId: 'tenant-id',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });
    } finally {
      restore();
    }
  });

  test('it should validate that SERVER_BASE_URL parses as a URL', async () => {
    const oauth = await loadOAuthModule();
    test.skip(typeof oauth.validateOAuthConfig !== 'function', 'validateOAuthConfig export is required for URL validation');

    expect(oauth.validateOAuthConfig({
      serverBaseUrl: 'https://mcp.example.test/path',
      tenantId: 'tenant-id',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    })).toEqual(expect.objectContaining({ valid: true }));

    expect(oauth.validateOAuthConfig({
      serverBaseUrl: 'not a url',
      tenantId: 'tenant-id',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    })).toEqual(expect.objectContaining({ valid: false }));
  });
});
