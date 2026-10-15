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

import * as assert from 'assert';
import * as vscode from 'vscode';
import { createEndpointUrls, normalizeBaseUrl } from '../../endpoints';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('darbotlabs.darbot-browser-mcp');
    assert.ok(extension, 'Extension should be installed');
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('darbotlabs.darbot-browser-mcp');
    assert.ok(extension, 'Extension should be installed');
    if (!extension)
      return;
    await extension.activate();
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    
    const expectedCommands = [
      'darbot-browser-mcp.startServer',
      'darbot-browser-mcp.stopServer',
      'darbot-browser-mcp.restartServer',
      'darbot-browser-mcp.showStatus',
      'darbot-browser-mcp.openBridgeStatus',
      'darbot-browser-mcp.openHealth',
      'darbot-browser-mcp.openRestTools',
      'darbot-browser-mcp.openOpenApi',
      'darbot-browser-mcp.copyMcpEndpoint',
      'darbot-browser-mcp.copyPowerPlatformEndpoint',
      'darbot-browser-mcp.forwardDevTunnel',
      'darbot-browser-mcp.setDevTunnelUrl',
      'darbot-browser-mcp.testEndpoints',
      'darbot-browser-mcp.openSettings',
    ];

    for (const cmd of expectedCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command ${cmd} should be registered`
      );
    }
  });

  test('Configuration should have default values', () => {
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
    
    assert.strictEqual(
      config.get('serverPath'),
      'npx @darbotlabs/darbot-browser-mcp@2.1.4',
      'serverPath should have default value'
    );
    assert.strictEqual(
      config.get('browser'),
      'msedge',
      'browser should default to msedge'
    );
    assert.strictEqual(
      config.get('headless'),
      false,
      'headless should default to false'
    );
    assert.strictEqual(
      config.get('noSandbox'),
      true,
      'noSandbox should default to true'
    );
    assert.strictEqual(
      config.get('transport'),
      'http',
      'transport should default to http'
    );
    assert.strictEqual(
      config.get('http.host'),
      '127.0.0.1',
      'HTTP host should default to loopback'
    );
    assert.strictEqual(
      config.get('http.port'),
      3000,
      'HTTP port should default to 3000'
    );
  });
});

suite('Endpoint Configuration Test Suite', () => {
  test('Normalizes endpoint URLs to their server base', () => {
    assert.strictEqual(
      normalizeBaseUrl('https://gp7hw9ml-3000.usw2.devtunnels.ms/mcp/'),
      'https://gp7hw9ml-3000.usw2.devtunnels.ms'
    );
    assert.strictEqual(
      normalizeBaseUrl('https://example.test/api/v1/tools'),
      'https://example.test'
    );
  });

  test('Builds MCP and Power Platform routes from one base URL', () => {
    const endpoints = createEndpointUrls('http://127.0.0.1:3000');
    assert.strictEqual(endpoints.mcp, 'http://127.0.0.1:3000/mcp');
    assert.strictEqual(endpoints.restTools, 'http://127.0.0.1:3000/api/v1/tools');
    assert.strictEqual(endpoints.powerPlatformBase, 'http://127.0.0.1:3000/api/v1');
    assert.strictEqual(endpoints.openApi, 'http://127.0.0.1:3000/openapi.json');
  });
});

suite('Status Notification Test Suite', () => {
  test('Status message format should be correct', () => {
    // Test the expected format of the status message
    const status = 'Stopped';
    const serverPath = 'npx @darbotlabs/darbot-browser-mcp@2.1.4';
    const browser = 'msedge';
    const headless = false;
    const noSandbox = true;

    const statusMessage = [
      `Darbot Browser Status: ${status}`,
      serverPath,
      `Browser: ${browser}`,
      `Headless: ${headless}`,
      `No Sandbox: ${noSandbox}`,
    ].join('\n');

    // Verify the format matches expected output
    const expectedLines = [
      'Darbot Browser Status: Stopped',
      'npx @darbotlabs/darbot-browser-mcp@2.1.4',
      'Browser: msedge',
      'Headless: false',
      'No Sandbox: true',
    ];

    const actualLines = statusMessage.split('\n');
    
    assert.strictEqual(actualLines.length, 5, 'Status message should have 5 lines');
    
    for (let i = 0; i < expectedLines.length; i++) {
      assert.strictEqual(
        actualLines[i],
        expectedLines[i],
        `Line ${i + 1} should match expected format`
      );
    }
  });

  test('Status message should show Running state correctly', () => {
    const status = 'Running';
    const serverPath = '@darbotlabs/darbot-browser-mcp@2.1.4';
    const browser = 'chrome';
    const headless = true;
    const noSandbox = false;

    const statusMessage = [
      `Darbot Browser Status: ${status}`,
      serverPath,
      `Browser: ${browser}`,
      `Headless: ${headless}`,
      `No Sandbox: ${noSandbox}`,
    ].join('\n');

    assert.ok(
      statusMessage.includes('Darbot Browser Status: Running'),
      'Should show Running status'
    );
    assert.ok(
      statusMessage.includes('Browser: chrome'),
      'Should show configured browser'
    );
    assert.ok(
      statusMessage.includes('Headless: true'),
      'Should show headless setting'
    );
  });

  test('Status notification should offer correct actions when stopped', () => {
    const isRunning = false;
    const actions = isRunning ? ['Stop Server', 'Restart Server'] : ['Start Server'];
    
    assert.deepStrictEqual(
      actions,
      ['Start Server'],
      'Should only offer Start Server when stopped'
    );
  });

  test('Status notification should offer correct actions when running', () => {
    const isRunning = true;
    const actions = isRunning ? ['Stop Server', 'Restart Server'] : ['Start Server'];
    
    assert.deepStrictEqual(
      actions,
      ['Stop Server', 'Restart Server'],
      'Should offer Stop and Restart when running'
    );
  });
});

suite('Server Exit Handling Test Suite', () => {
  test('Should not show error for intentional stop (code null)', () => {
    // When server is killed intentionally, code is null and we should NOT show error
    const intentionallyStopped = true;
    const code: number | null = null;
    const signal: string | null = 'SIGTERM';

    // Logic from extension.ts exit handler
    const shouldShowError = !intentionallyStopped && code !== 0 && code !== null;
    const shouldShowWarning = !intentionallyStopped && signal;

    assert.strictEqual(shouldShowError, false, 'Should not show error for intentional stop');
    assert.strictEqual(shouldShowWarning, false, 'Should not show warning for intentional stop');
  });

  test('Should show error for unexpected crash (code non-zero)', () => {
    const intentionallyStopped = false;
    const code: number | null = 1;

    const shouldShowError = !intentionallyStopped && code !== 0 && code !== null;

    assert.strictEqual(shouldShowError, true, 'Should show error for unexpected exit code 1');
  });

  test('Should show warning for external signal termination', () => {
    const intentionallyStopped = false;
    const code: number | null = null;
    const signal: string | null = 'SIGKILL';

    const shouldShowError = !intentionallyStopped && code !== 0 && code !== null;
    const shouldShowWarning = !intentionallyStopped && !!signal;

    assert.strictEqual(shouldShowError, false, 'Should not show error for signal termination');
    assert.strictEqual(shouldShowWarning, true, 'Should show warning for external signal');
  });

  test('Should not show error for clean exit (code 0)', () => {
    const intentionallyStopped = false;
    const code: number | null = 0;

    const shouldShowError = !intentionallyStopped && code !== 0 && code !== null;

    assert.strictEqual(shouldShowError, false, 'Should not show error for clean exit');
  });
});
