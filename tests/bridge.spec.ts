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

import http from 'node:http';
import net from 'node:net';

import { test, expect } from './fixtures.js';
import { resolveCLIConfig } from '../src/config.js';

const bridgePorts = [9223, 9224, 9225] as const;

type BridgeStatus = {
  bridge: string;
  version: string;
  extensionConnected: boolean;
  mcpConnected: boolean;
  targetInfo: { url: string; title: string; type: string } | null;
  sessionId: string | null;
  extensionVersion: string | null;
};

const connectedBridgeStatus: BridgeStatus = {
  bridge: 'darbot-browser-bridge',
  version: '2.0.0',
  extensionConnected: true,
  mcpConnected: false,
  targetInfo: {
    url: 'https://example.test/',
    title: 'Shared tab',
    type: 'page',
  },
  sessionId: 'session-123',
  extensionVersion: '2.0.0',
};

async function isPortFree(port: number): Promise<boolean> {
  return await new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

async function requireFreePorts(ports: readonly number[]) {
  for (const port of ports)
    test.skip(!(await isPortFree(port)), `Bridge test port ${port} is already in use`);
}

async function startMockBridge(port: number, status: BridgeStatus): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    if (req.url !== '/bridge') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(status));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, resolve);
  });
  return server;
}

async function closeServer(server: http.Server) {
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

async function fetchBridgeStatus(port: number): Promise<BridgeStatus> {
  const response = await fetch(`http://localhost:${port}/bridge`);
  return await response.json() as BridgeStatus;
}

test.describe.configure({ mode: 'serial' });

test.describe('bridge auto-detection', () => {
  test('it should use a normal browser when no bridge is running', async () => {
    await requireFreePorts(bridgePorts);

    const config = await resolveCLIConfig({ sandbox: false });

    expect(config.browser.cdpEndpoint).toBeUndefined();
  });

  test('it should use a normal browser when a bridge has no extension connected', async () => {
    await requireFreePorts([9223]);
    const server = await startMockBridge(9223, {
      ...connectedBridgeStatus,
      extensionConnected: false,
      targetInfo: null,
      sessionId: null,
      extensionVersion: null,
    });

    try {
      const config = await resolveCLIConfig({ sandbox: false });

      expect(config.browser.cdpEndpoint).toBeUndefined();
    } finally {
      await closeServer(server);
    }
  });

  test('it should use the bridge CDP endpoint when an extension is connected', async () => {
    await requireFreePorts([9224]);
    const server = await startMockBridge(9224, connectedBridgeStatus);

    try {
      const config = await resolveCLIConfig({ sandbox: false });

      expect(config.browser.cdpEndpoint).toBe('ws://localhost:9224/cdp');
      expect(config.browser.browserName).toBe('chromium');
    } finally {
      await closeServer(server);
    }
  });

  test('it should expose the documented bridge status shape', async () => {
    await requireFreePorts([9225]);
    const server = await startMockBridge(9225, connectedBridgeStatus);

    try {
      const status = await fetchBridgeStatus(9225);

      expect(status).toEqual({
        bridge: expect.any(String),
        version: expect.any(String),
        extensionConnected: expect.any(Boolean),
        mcpConnected: expect.any(Boolean),
        targetInfo: expect.objectContaining({
          url: expect.any(String),
          title: expect.any(String),
          type: expect.any(String),
        }),
        sessionId: expect.any(String),
        extensionVersion: expect.any(String),
      });
    } finally {
      await closeServer(server);
    }
  });
});
