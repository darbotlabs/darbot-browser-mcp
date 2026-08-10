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

type HealthOptions = {
  bridgeRequired?: boolean;
  bridgeConnected?: boolean;
  oauthValid?: boolean;
};

async function createHealthTestServer(options: HealthOptions) {
  const health = await import('../src/health.js') as any;
  const oauth = await import('../src/auth/mcpOAuthProvider.js') as any;
  const validateOAuthConfig = typeof oauth.validateOAuthConfig === 'function'
    ? () => ({ valid: options.oauthValid ?? true })
    : undefined;

  if (typeof health.createHealthApp === 'function') {
    const app = health.createHealthApp({
      bridgeRequired: options.bridgeRequired ?? false,
      getBridgeStatus: () => ({ extensionConnected: options.bridgeConnected ?? true }),
      validateOAuthConfig,
    });
    return await listen(app);
  }

  if (typeof health.registerHealthEndpoints === 'function') {
    const express = (await import('express')).default;
    const app = express();
    health.registerHealthEndpoints(app, {
      bridgeRequired: options.bridgeRequired ?? false,
      getBridgeStatus: () => ({ extensionConnected: options.bridgeConnected ?? true }),
      validateOAuthConfig,
    });
    return await listen(app);
  }

  test.skip(true, 'src/health.ts must export createHealthApp or registerHealthEndpoints for /health and /ready tests');
  throw new Error('src/health.ts must export createHealthApp or registerHealthEndpoints');
}

async function listen(app: any) {
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Expected health test server to listen on a TCP port');
  return {
    baseURL: `http://localhost:${address.port}`,
    close: async () => await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => error ? reject(error) : resolve());
    }),
  };
}

async function getJSON(baseURL: string, path: string) {
  const response = await fetch(`${baseURL}${path}`);
  return {
    status: response.status,
    body: await response.json(),
  };
}

test.describe('health endpoints', () => {
  test('it should return 200 with ok status from /health when healthy', async () => {
    const server = await createHealthTestServer({ oauthValid: true });

    try {
      const response = await getJSON(server.baseURL, '/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'ok' }));
    } finally {
      await server.close();
    }
  });

  test('it should return 503 from /ready if bridge is required but not connected', async () => {
    const server = await createHealthTestServer({ bridgeRequired: true, bridgeConnected: false, oauthValid: true });

    try {
      const response = await getJSON(server.baseURL, '/ready');

      expect(response.status).toBe(503);
      expect(response.body).toEqual(expect.objectContaining({ status: expect.stringMatching(/not_ready|degraded|fail/i) }));
    } finally {
      await server.close();
    }
  });

  test('it should return 200 from /ready when ready', async () => {
    const server = await createHealthTestServer({ bridgeRequired: true, bridgeConnected: true, oauthValid: true });

    try {
      const response = await getJSON(server.baseURL, '/ready');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'ok' }));
    } finally {
      await server.close();
    }
  });

  test('it should expose /live and reject removed z-suffixed aliases', async () => {
    const server = await createHealthTestServer({ oauthValid: true });

    try {
      const live = await fetch(`${server.baseURL}/live`);
      expect(live.status).toBe(200);

      for (const path of ['/healthz', '/readyz', '/livez']) {
        const response = await fetch(`${server.baseURL}${path}`);
        expect(response.status).toBe(404);
      }
    } finally {
      await server.close();
    }
  });

  test('it should include OAuth configuration validity in status output', async () => {
    const oauth = await import('../src/auth/mcpOAuthProvider.js') as any;
    test.skip(typeof oauth.validateOAuthConfig !== 'function', 'validateOAuthConfig export is required for OAuth health status');
    const server = await createHealthTestServer({ oauthValid: false });

    try {
      const response = await getJSON(server.baseURL, '/health');

      expect(response.body).toEqual(expect.objectContaining({
        oauth: expect.objectContaining({ valid: false }),
      }));
    } finally {
      await server.close();
    }
  });
});
