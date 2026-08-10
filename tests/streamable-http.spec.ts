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

import fs from 'node:fs';
import url from 'node:url';

import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { test as baseTest, expect } from './fixtures.js';
import type { Config } from '../config.d.ts';

// NOTE: Can be removed when we drop Node.js 23 support and changed to import.meta.filename.
const __filename = url.fileURLToPath(import.meta.url);

// Streamable HTTP tests launch browser processes which is slow - increase timeout
baseTest.setTimeout(120000);

const test = baseTest.extend<{ serverEndpoint: (options?: { args?: string[], noPort?: boolean }) => Promise<{ url: URL, stderr: () => string }> }>({
  serverEndpoint: async ({ mcpHeadless }, use, testInfo) => {
    let cp: ChildProcess | undefined;
    const userDataDir = testInfo.outputPath('user-data-dir');
    await use(async (options?: { args?: string[], noPort?: boolean }) => {
      if (cp)
        throw new Error('Process already running');

      cp = spawn('node', [
        path.join(path.dirname(__filename), '../cli.js'),
        ...(options?.noPort ? [] : ['--port=0']),
        '--user-data-dir=' + userDataDir,
        ...(mcpHeadless ? ['--headless'] : []),
        ...(options?.args || []),
      ], {
        stdio: 'pipe',
        env: {
          ...process.env,
          DEBUG: 'pw:mcp:test',
          DEBUG_COLORS: '0',
          DEBUG_HIDE_DATE: '1',
        },
      });
      let stderr = '';
      const url = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for server to start')), 30000);
        cp!.stderr?.on('data', data => {
          stderr += data.toString();
          // Match "listening on http://..." (case insensitive)
          const match = stderr.match(/listening on (http:\/\/[^\s]+)/i);
          if (match) {
            clearTimeout(timeout);
            resolve(match[1]);
          }
        });
        cp!.on('exit', code => {
          clearTimeout(timeout);
          reject(new Error(`Process exited with code ${code}`));
        });
      });

      return { url: new URL(url), stderr: () => stderr };
    });
    cp?.kill('SIGTERM');
  },
});

test('streamable http transport', async ({ serverEndpoint }) => {
  const { url } = await serverEndpoint();
  const transport = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client = new Client({ name: 'test', version: '1.3.0' });
  await client.connect(transport);
  await client.ping();
});

test('streamable http transport (config)', async ({ serverEndpoint }) => {
  const config: Config = {
    server: {
      port: 0,
    }
  };
  const configFile = test.info().outputPath('config.json');
  await fs.promises.writeFile(configFile, JSON.stringify(config, null, 2));

  const { url } = await serverEndpoint({ noPort: true, args: ['--config=' + configFile] });
  const transport = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client = new Client({ name: 'test', version: '1.3.0' });
  await client.connect(transport);
  await client.ping();
});

test('streamable http browser lifecycle (isolated)', async ({ serverEndpoint, server }) => {
  const { url, stderr } = await serverEndpoint({ args: ['--isolated'] });

  const transport1 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client1 = new Client({ name: 'test', version: '1.3.0' });
  await client1.connect(transport1);
  await client1.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  await transport1.terminateSession();
  await client1.close();

  const transport2 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client2 = new Client({ name: 'test', version: '1.3.0' });
  await client2.connect(transport2);
  await client2.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  await transport2.terminateSession();
  await client2.close();

  await expect(async () => {
    const lines = stderr().split('\n');
    expect(lines.filter(line => line.match(/New session created:/)).length).toBe(2);
    expect(lines.filter(line => line.match(/Session closed:/)).length).toBe(2);
  }).toPass();
});

test('streamable http browser lifecycle (isolated, multiclient)', async ({ serverEndpoint, server }) => {
  const { url, stderr } = await serverEndpoint({ args: ['--isolated'] });

  const transport1 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client1 = new Client({ name: 'test', version: '1.3.0' });
  await client1.connect(transport1);
  await client1.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  const transport2 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client2 = new Client({ name: 'test', version: '1.3.0' });
  await client2.connect(transport2);
  await client2.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  await transport1.terminateSession();
  await client1.close();

  const transport3 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client3 = new Client({ name: 'test', version: '1.3.0' });
  await client3.connect(transport3);
  await client3.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  await transport2.terminateSession();
  await client2.close();
  await transport3.terminateSession();
  await client3.close();

  await expect(async () => {
    const lines = stderr().split('\n');
    expect(lines.filter(line => line.match(/New session created:/)).length).toBe(3);
    expect(lines.filter(line => line.match(/Session closed:/)).length).toBe(3);
  }).toPass();
});

test('streamable http browser lifecycle (persistent)', async ({ serverEndpoint, server }) => {
  const { url, stderr } = await serverEndpoint();

  const transport1 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client1 = new Client({ name: 'test', version: '1.3.0' });
  await client1.connect(transport1);
  await client1.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  await transport1.terminateSession();
  await client1.close();

  const transport2 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client2 = new Client({ name: 'test', version: '1.3.0' });
  await client2.connect(transport2);
  await client2.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  await transport2.terminateSession();
  await client2.close();

  await expect(async () => {
    const lines = stderr().split('\n');
    expect(lines.filter(line => line.match(/New session created:/)).length).toBe(2);
    expect(lines.filter(line => line.match(/Session closed:/)).length).toBe(2);
  }).toPass();
});

test('streamable http browser lifecycle (persistent, multiclient)', async ({ serverEndpoint, server }) => {
  const { url } = await serverEndpoint();

  const transport1 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client1 = new Client({ name: 'test', version: '1.3.0' });
  await client1.connect(transport1);
  await client1.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  const transport2 = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client2 = new Client({ name: 'test', version: '1.3.0' });
  await client2.connect(transport2);
  const response = await client2.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  expect(response.isError).toBe(true);
  expect(response.content?.[0].text).toContain('use --isolated to run multiple instances of the same browser');

  await transport1.terminateSession();
  await client1.close();
  await transport2.terminateSession();
  await client2.close();
});

test('streamable http transport session support', async ({ serverEndpoint }) => {
  const { url } = await serverEndpoint();
  const transport = new StreamableHTTPClientTransport(new URL('/mcp', url));
  const client = new Client({ name: 'test', version: '1.3.0' });
  await client.connect(transport);
  await client.ping();
  expect(transport.sessionId, 'has session support').toBeDefined();
  await transport.terminateSession();
  await client.close();
});
