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

import { Config } from '../config.js';
import { test, expect } from './fixtures.js';

test('config user data dir', async ({ startClient, server, mcpMode }, testInfo) => {
  test.skip(mcpMode === 'extension', 'Connecting to CDP server does not use user data dir');
  server.setContent('/', `
    <title>Title</title>
    <body>Hello, world!</body>
  `, 'text/html');

  const config: Config = {
    browser: {
      userDataDir: testInfo.outputPath('user-data-dir'),
    },
  };
  const configPath = testInfo.outputPath('config.json');
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));

  const { client } = await startClient({ args: ['--config', configPath] });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  })).toContainTextContent(`Hello, world!`);

  const files = await fs.promises.readdir(config.browser!.userDataDir!);
  expect(files.length).toBeGreaterThan(0);
});

test.describe(() => {
  test.use({ mcpBrowser: '' });
  test('browserName', { annotation: { type: 'issue', description: 'https://github.com/darbotlabs/darbot-browser-mcp/issues/458' } }, async ({ startClient, mcpMode }, testInfo) => {
    test.skip(mcpMode === 'extension', 'Extension mode only supports Chromium');
    // Skip if Firefox is not installed - check by trying to launch it
    const config: Config = {
      browser: {
        browserName: 'firefox',
      },
    };
    const configPath = testInfo.outputPath('config.json');
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));

    const { client } = await startClient({ args: ['--config', configPath] });
    const result = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'data:text/html,<script>document.title = navigator.userAgent</script>' },
    });
    
    // Either Firefox works and shows Firefox in UA, or it's not installed
    const text = (result.content as any)[0]?.text || '';
    if (text.includes('not installed') || text.includes('Browser specified in your config')) {
      test.skip(true, 'Firefox is not installed on this system');
    }
    expect(result).toContainTextContent(`Firefox`);
  });
});

test.describe('Edge Profile CLI Options', () => {
  test('--edge-profile sets profile context', async ({ startClient }) => {
    const { client } = await startClient({
      args: ['--edge-profile', 'TestProfile'],
    });

    // Navigate and verify context is tracked
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'data:text/html,<title>Edge Profile Test</title>' },
    });

    // Profile context is captured in session state save
    const result = await client.callTool({
      name: 'browser_save_profile',
      arguments: { name: `config-edge-test-${Date.now()}` },
    });

    expect(result).toContainTextContent('**Edge Profile:** TestProfile');
  });

  test('--edge-profile-email sets email context', async ({ startClient }) => {
    const { client } = await startClient({
      args: ['--edge-profile', 'Work', '--edge-profile-email', 'test@example.com'],
    });

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'data:text/html,<title>Email Test</title>' },
    });

    const result = await client.callTool({
      name: 'browser_save_profile',
      arguments: { name: `config-email-test-${Date.now()}` },
    });

    expect(result).toContainTextContent('**Edge Profile:** Work (test@example.com)');
  });

  test('--workspace sets workspace context', async ({ startClient }) => {
    const { client } = await startClient({
      args: ['--workspace', 'my-project'],
    });

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'data:text/html,<title>Workspace Test</title>' },
    });

    const result = await client.callTool({
      name: 'browser_save_profile',
      arguments: { name: `config-workspace-test-${Date.now()}` },
    });

    expect(result).toContainTextContent('**VS Code Workspace:** my-project');
  });

  test('all Edge context options together', async ({ startClient }) => {
    const { client } = await startClient({
      args: [
        '--edge-profile', 'Personal',
        '--edge-profile-email', 'user@gmail.com',
        '--workspace', 'test-project'
      ],
    });

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'data:text/html,<title>Full Context Test</title>' },
    });

    const result = await client.callTool({
      name: 'browser_save_profile',
      arguments: { name: `config-full-context-test-${Date.now()}` },
    });

    expect(result).toContainTextContent('**Edge Profile:** Personal (user@gmail.com)');
    expect(result).toContainTextContent('**VS Code Workspace:** test-project');
  });
});
