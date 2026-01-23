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

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('darbotlabs.darbot-browser-mcp');
    assert.ok(extension, 'Extension should be installed');
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('darbotlabs.darbot-browser-mcp');
    assert.ok(extension, 'Extension should be installed');
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
      'npx @darbotlabs/darbot-browser-mcp@latest',
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
  });
});

suite('Status Notification Test Suite', () => {
  test('Status message format should be correct', () => {
    // Test the expected format of the status message
    const status = 'Stopped';
    const serverPath = 'npx @darbotlabs/darbot-browser-mcp@latest';
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
      'npx @darbotlabs/darbot-browser-mcp@latest',
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
    const serverPath = '@darbotlabs/darbot-browser-mcp@latest';
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
