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

import { test, expect } from '@playwright/test';
import {
  UnifiedAuthenticator,
  type AuthenticatedUser,
} from '../src/auth/index.js';
import { EntraIDAuthenticator } from '../src/auth/entraAuth.js';
import { createManagedIdentityConfig } from '../src/auth/managedIdentityAuth.js';
import { DevTunnelAuthenticator } from '../src/auth/tunnelAuth.js';
import { verifyEntraJwt } from '../src/auth/entraJwtVerifier.js';

import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

const authEnvVars = [
  'ALLOW_ANONYMOUS_ACCESS',
  'API_KEY_AUTH_ENABLED',
  'API_KEYS',
  'ENTRA_AUTH_ENABLED',
  'TUNNEL_AUTH_ENABLED',
  'TUNNEL_ALLOWED_DOMAINS',
  'MANAGED_IDENTITY_ENABLED',
  'AZURE_USE_MANAGED_IDENTITY',
  'AZURE_CLIENT_ID_MANAGED_IDENTITY',
  'AZURE_KEY_VAULT_URL',
  'KEY_VAULT_URL',
  'IDENTITY_ENDPOINT',
  'REQUIRED_ROLES',
] as const;

test.describe.configure({ mode: 'serial' });

function withAuthEnv(env: Partial<Record<typeof authEnvVars[number], string>>) {
  const previous = new Map(authEnvVars.map(name => [name, process.env[name]]));
  for (const name of authEnvVars)
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

function request(headers: IncomingHttpHeaders = {}): IncomingMessage {
  return { headers } as IncomingMessage;
}

test('unified auth allows anonymous access only when no method is enabled', async () => {
  const restore = withAuthEnv({});
  try {
    const authenticator = new UnifiedAuthenticator({ allowAnonymous: false });
    await expect(authenticator.authenticate(request())).resolves.toMatchObject({
      authenticated: true,
      method: 'anonymous',
    });
  } finally {
    restore();
  }
});

test('API key auth accepts configured keys and rejects other values', async () => {
  const restore = withAuthEnv({
    API_KEY_AUTH_ENABLED: 'true',
    API_KEYS: 'alpha-key, beta-key',
  });
  try {
    const authenticator = new UnifiedAuthenticator({
      allowAnonymous: false,
      enableApiKey: true,
      enableEntra: false,
      enableTunnel: false,
      enableManagedIdentity: false,
    });

    await expect(authenticator.authenticate(request({ 'x-api-key': 'beta-key' }))).resolves.toMatchObject({
      authenticated: true,
      method: 'api-key',
    });
    await expect(authenticator.authenticate(request({ 'x-api-key': 'wrong-key' }))).resolves.toMatchObject({
      authenticated: false,
      method: 'none',
    });
  } finally {
    restore();
  }
});

test('tunnel auth honors trusted forwarding and extracts the GitHub identity', async () => {
  const authenticator = new DevTunnelAuthenticator({
    enabled: true,
    allowedDomains: ['.devtunnels.ms'],
    trustForwardedHeaders: false,
  });
  const forwardedOnly = request({
    'x-forwarded-host': 'project.devtunnels.ms',
    'x-vs-tunnel-user': 'octocat',
  });
  expect(authenticator.isTunnelRequest(forwardedOnly)).toBe(false);

  const directTunnel = request({
    'host': 'project.devtunnels.ms',
    'x-vs-tunnel-user': 'octocat',
    'x-vs-tunnel-session': 'session-1',
  });
  await expect(authenticator.authenticate(directTunnel)).resolves.toEqual({
    authenticated: true,
    githubUser: 'octocat',
    tunnelId: 'session-1',
  });
});

test('Entra authenticator preserves development identity when explicitly disabled', async () => {
  const authenticator = new EntraIDAuthenticator({ enabled: false });
  await expect(authenticator.authenticate(request())).resolves.toEqual({
    userId: 'dev-user',
    tenantId: 'dev-tenant',
    roles: ['user'],
    permissions: ['browser:read', 'browser:write'],
  });
});

test('unified Entra auth enforces configured RBAC roles', async () => {
  const restore = withAuthEnv({ ENTRA_AUTH_ENABLED: 'true' });
  try {
    const authenticator = new UnifiedAuthenticator({
      allowAnonymous: false,
      enableApiKey: false,
      enableEntra: true,
      enableTunnel: false,
      enableManagedIdentity: false,
      requiredRoles: ['admin'],
    });
    const internal = authenticator as unknown as {
      entraAuth: { authenticate: () => Promise<AuthenticatedUser | null> };
    };
    internal.entraAuth.authenticate = async () => ({
      userId: 'user-1',
      tenantId: 'tenant-1',
      roles: ['reader'],
      permissions: ['browser:read'],
    });

    await expect(authenticator.authenticate(request())).resolves.toMatchObject({
      authenticated: false,
      error: 'Insufficient permissions. Required roles: admin',
    });

    internal.entraAuth.authenticate = async () => ({
      userId: 'user-1',
      tenantId: 'tenant-1',
      roles: ['admin'],
      permissions: ['browser:read', 'browser:write'],
    });
    await expect(authenticator.authenticate(request())).resolves.toMatchObject({
      authenticated: true,
      method: 'entra',
    });
  } finally {
    restore();
  }
});

test('managed identity configuration supports user-assigned identity and Key Vault', () => {
  const restore = withAuthEnv({
    MANAGED_IDENTITY_ENABLED: 'true',
    AZURE_CLIENT_ID_MANAGED_IDENTITY: 'managed-client-id',
    AZURE_KEY_VAULT_URL: 'https://example.vault.azure.net',
  });
  try {
    expect(createManagedIdentityConfig()).toEqual({
      enabled: true,
      userAssignedClientId: 'managed-client-id',
      keyVaultUrl: 'https://example.vault.azure.net',
    });
  } finally {
    restore();
  }
});

test('Entra JWT validation rejects unsigned tokens before trusting claims', async () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', kid: 'untrusted' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://login.microsoftonline.com/tenant-1/v2.0',
    aud: 'client-1',
    tid: 'tenant-1',
    exp: Math.floor(Date.now() / 1000) + 300,
  })).toString('base64url');

  await expect(verifyEntraJwt(`${header}.${payload}.`, {
    tenantId: 'tenant-1',
    clientId: 'client-1',
  })).rejects.toThrow('Unsupported JWT signing algorithm');
});
