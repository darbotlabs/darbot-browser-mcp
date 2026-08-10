/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import http from 'node:http';

import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { httpAddressToString, startHttpServer, startHttpTransport } from '../src/transport.js';

import type { Connection } from '../src/connection.js';
import type { Server } from '../src/server.js';
import type { Tool } from '../src/tools/tool.js';

const authEnvVars = [
  'API_KEY_AUTH_ENABLED',
  'API_KEYS',
  'ENTRA_AUTH_ENABLED',
  'TUNNEL_AUTH_ENABLED',
  'MANAGED_IDENTITY_ENABLED',
  'AZURE_USE_MANAGED_IDENTITY',
] as const;

async function request(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: unknown }> {
  return await new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      agent: false,
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: body ? JSON.parse(body) : undefined,
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (options.body)
      req.write(options.body);
    req.end();
  });
}

test.describe('REST tool adapter', () => {
  test.describe.configure({ mode: 'serial' });

  let baseUrl = '';
  let closeServer: () => Promise<void>;
  const previousAuthEnv = new Map<string, string | undefined>();

  test.beforeAll(async () => {
    for (const name of authEnvVars) {
      previousAuthEnv.set(name, process.env[name]);
      delete process.env[name];
    }
    process.env.API_KEY_AUTH_ENABLED = 'true';
    process.env.API_KEYS = 'alpha-key,beta-key';

    const echoTool = {
      capability: 'core',
      schema: {
        name: 'browser_echo',
        title: 'Echo',
        description: 'Echo a value.',
        inputSchema: z.object({ value: z.string() }),
        type: 'readOnly',
      },
    } as Tool;

    const fakeServer = {
      config: {
        copilotStudio: {
          maxConcurrentSessions: 4,
          sessionTimeoutMs: 60_000,
        },
      },
      createDetachedConnection: (options: { storageNamespace?: string } = {}) => {
        let calls = 0;
        const connection = {
          context: {
            tools: [echoTool],
            run: async (tool: Tool, params: Record<string, unknown>) => {
              const parsed = tool.schema.inputSchema.parse(params);
              calls++;
              return {
                content: [{
                  type: 'text',
                  text: `${parsed.value}:${calls}:${options.storageNamespace}`,
                }],
              };
            },
          },
          close: async () => {},
        };
        return connection as unknown as Connection;
      },
      closeConnection: async (connection: Connection) => {
        await connection.close();
      },
    } as unknown as Server;

    const { httpServer, app } = await startHttpServer({ host: '127.0.0.1', port: 0 });
    startHttpTransport(httpServer, fakeServer, app);
    baseUrl = httpAddressToString(httpServer.address());
    closeServer = () => new Promise<void>((resolve, reject) => {
      httpServer.closeAllConnections();
      httpServer.close(error => error ? reject(error) : resolve());
    });
  });

  test.afterAll(async () => {
    await closeServer();
    for (const [name, value] of previousAuthEnv) {
      if (value === undefined)
        delete process.env[name];
      else
        process.env[name] = value;
    }
  });

  test('lists tools and reuses the principal default session', async () => {
    const listResponse = await request(`${baseUrl}/api/v1/tools`, {
      headers: { 'X-API-Key': 'alpha-key' },
    });
    expect(listResponse.status).toBe(200);
    const list = listResponse.body as { count: number; tools: Array<{ name: string }> };
    expect(list.count).toBe(1);
    expect(list.tools.map(tool => tool.name)).toEqual(['browser_echo']);

    const firstResponse = await request(`${baseUrl}/api/v1/tools/browser_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'alpha-key',
      },
      body: JSON.stringify({ value: 'first' }),
    });
    expect(firstResponse.status).toBe(200);
    const sessionId = firstResponse.headers['x-darbot-session-id'];
    expect(sessionId).toBeTruthy();
    const first = firstResponse.body as { content: Array<{ text: string }> };
    expect(first.content[0]?.text).toContain('first:1:api-key:');

    const secondResponse = await request(`${baseUrl}/api/v1/tools/browser_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'alpha-key',
      },
      body: JSON.stringify({ value: 'second' }),
    });
    const second = secondResponse.body as { content: Array<{ text: string }> };
    expect(second.content[0]?.text).toContain('second:2:api-key:');

    const explicitResponse = await request(`${baseUrl}/api/v1/tools/browser_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'alpha-key',
        'X-Darbot-Session-Id': String(sessionId),
      },
      body: JSON.stringify({ value: 'explicit' }),
    });
    const explicit = explicitResponse.body as { content: Array<{ text: string }> };
    expect(explicit.content[0]?.text).toContain('explicit:3:api-key:');

    const crossPrincipalResponse = await request(`${baseUrl}/api/v1/tools/browser_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'beta-key',
        'X-Darbot-Session-Id': String(sessionId),
      },
      body: JSON.stringify({ value: 'forbidden' }),
    });
    expect(crossPrincipalResponse.status).toBe(403);

    const betaResponse = await request(`${baseUrl}/api/v1/tools/browser_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'beta-key',
      },
      body: JSON.stringify({ value: 'beta' }),
    });
    const beta = betaResponse.body as { content: Array<{ text: string }> };
    expect(beta.content[0]?.text).toContain('beta:1:api-key:');
  });

  test('rejects unknown REST session identifiers', async () => {
    const response = await request(`${baseUrl}/api/v1/tools/browser_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'alpha-key',
        'X-Darbot-Session-Id': '00000000-0000-0000-0000-000000000000',
      },
      body: JSON.stringify({ value: 'missing' }),
    });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'session_not_found' });
  });
});
