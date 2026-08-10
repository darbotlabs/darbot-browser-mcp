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
import path from 'node:path';
import os from 'node:os';

import { test, expect } from './fixtures.js';

function getSessionStatesDir(): string {
  if (process.env.DARBOT_SESSION_STATE_DIR)
    return path.resolve(process.env.DARBOT_SESSION_STATE_DIR);

  let profilesDir: string;
  if (process.platform === 'linux')
    profilesDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  else if (process.platform === 'darwin')
    profilesDir = path.join(os.homedir(), 'Library', 'Application Support');
  else if (process.platform === 'win32')
    profilesDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  else
    throw new Error('Unsupported platform: ' + process.platform);

  return path.join(profilesDir, 'darbot-browser-mcp', 'session-states');
}

async function removeSessionState(name: string): Promise<void> {
  const sessionDir = path.join(getSessionStatesDir(), name.replace(/[^a-zA-Z0-9-_]/g, '_'));
  await fs.promises.rm(sessionDir, { recursive: true, force: true });
}

test.describe('Session State Management', () => {
  const testProfileName = `test-session-${Date.now()}`;

  test.afterAll(async () => {
    // Cleanup: Remove test session state
    const sessionDir = path.join(getSessionStatesDir(), testProfileName.replace(/[^a-zA-Z0-9-_]/g, '_'));
    try {
      await fs.promises.rm(sessionDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('browser_save_profile saves session state with v2.0 format', async ({ client, server }) => {
    server.setContent('/', `
      <title>Test Page</title>
      <body>Hello from test!</body>
    `, 'text/html');

    // Navigate to a page first
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Save session state
    const result = await client.callTool({
      name: 'browser_save_profile',
      arguments: {
        name: testProfileName,
        description: 'Test session state for v2.0 format validation',
      },
    });

    // Check response format
    expect(result).toContainTextContent(`Session state "${testProfileName}" saved successfully`);
    expect(result).toContainTextContent('### Session State Details');
    expect(result).toContainTextContent(`**Name:** ${testProfileName}`);
    expect(result).toContainTextContent('**URL:**');
    expect(result).toContainTextContent('**Title:**');
    expect(result).toContainTextContent('**Created:**');
    expect(result).toContainTextContent('### Context');
    expect(result).toContainTextContent('**Edge Profile:**');

    // Verify file was saved with v2.0 format
    const sessionDir = path.join(getSessionStatesDir(), testProfileName.replace(/[^a-zA-Z0-9-_]/g, '_'));
    const profileJsonPath = path.join(sessionDir, 'profile.json');

    const profileData = JSON.parse(await fs.promises.readFile(profileJsonPath, 'utf8'));

    // Verify v2.0 format fields
    expect(profileData.version).toBe('2.0');
    expect(profileData.type).toBe('darbot-session-state');
    expect(profileData.edgeProfile).toBeDefined();
    expect(profileData.edgeProfile.name).toBeDefined();
    expect(profileData.name).toBe(testProfileName);
    expect(profileData.description).toBe('Test session state for v2.0 format validation');
    expect(profileData.url).toBeDefined();
    expect(profileData.title).toBeDefined();
    expect(profileData.created).toBeDefined();
  });

  test('browser_list_profiles shows session states with Edge context', async ({ client }) => {
    const result = await client.callTool({
      name: 'browser_list_profiles',
      arguments: {},
    });

    // Check response format
    expect(result).toContainTextContent('### Saved Darbot Session States');

    // Should show the test profile we created (if it exists)
    if (result.content?.[0]?.text?.includes(testProfileName)) {
      expect(result).toContainTextContent(`**${testProfileName}**`);
      expect(result).toContainTextContent('Edge Profile:');
    }
  });

  test('browser_switch_profile restores session state', async ({ client, server }) => {
    // Create a unique profile for this test
    const switchTestProfile = `switch-test-${Date.now()}`;

    server.setContent('/save-page', `
      <title>Original Page</title>
      <body>Original content</body>
    `, 'text/html');

    server.setContent('/different', `
      <title>Different Page</title>
      <body>This is a different page</body>
    `, 'text/html');

    // Navigate to a page and wait for it to be stable
    const navResult = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX + 'save-page' },
    });
    expect(navResult).toContainTextContent('Original content');

    // Take a snapshot to ensure the page is fully loaded
    await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    const saveResult = await client.callTool({
      name: 'browser_save_profile',
      arguments: { name: switchTestProfile, description: 'Profile for switch test' },
    });

    // Verify save was successful before proceeding
    expect(saveResult).toContainTextContent(`Session state "${switchTestProfile}" saved successfully`);

    // Navigate to a different page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX + 'different' },
    });

    // Switch back to saved profile
    const result = await client.callTool({
      name: 'browser_switch_profile',
      arguments: { name: switchTestProfile },
    });

    // Check response format
    expect(result).toContainTextContent(`Session state "${switchTestProfile}" restored`);
    expect(result).toContainTextContent('### Session State Details');
    expect(result).toContainTextContent('**Storage:**');

    // Cleanup
    await client.callTool({
      name: 'browser_delete_profile',
      arguments: { name: switchTestProfile },
    });
  });

  test('browser_delete_profile removes session state', async ({ client }) => {
    const deleteProfileName = `delete-test-${Date.now()}`;

    // First save a profile to delete
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'data:text/html,<title>Delete Test</title>' },
    });

    await client.callTool({
      name: 'browser_save_profile',
      arguments: { name: deleteProfileName, description: 'To be deleted' },
    });

    // Delete it
    const result = await client.callTool({
      name: 'browser_delete_profile',
      arguments: { name: deleteProfileName },
    });

    expect(result).toContainTextContent(`Session state "${deleteProfileName}" deleted successfully`);

    // Verify file is gone
    const sessionDir = path.join(getSessionStatesDir(), deleteProfileName.replace(/[^a-zA-Z0-9-_]/g, '_'));
    await expect(fs.promises.access(sessionDir)).rejects.toThrow();
  });

  test('browser_switch_profile handles non-existent session state', async ({ client }) => {
    const result = await client.callTool({
      name: 'browser_switch_profile',
      arguments: { name: 'non-existent-profile-12345' },
    });

    expect(result).toContainTextContent('Session state "non-existent-profile-12345" not found');
  });

  test('browser_delete_profile handles non-existent session state', async ({ client }) => {
    const result = await client.callTool({
      name: 'browser_delete_profile',
      arguments: { name: 'non-existent-profile-67890' },
    });

    expect(result).toContainTextContent('Session state "non-existent-profile-67890" not found');
  });

  test('portable session-state bundles export and import storage state', async ({ startClient, server }, testInfo) => {
    const outputDir = testInfo.outputPath('portable-session-state');
    const sourceName = `portable-source-${Date.now()}`;
    const importedName = `portable-import-${Date.now()}`;
    const bundleName = 'portable-session.darbot-session-state.json';
    await fs.promises.mkdir(outputDir, { recursive: true });

    const { client } = await startClient({
      args: ['--output-dir', outputDir],
    });

    try {
      server.setContent('/portable', `
        <title>Portable Session</title>
        <body>Portable session state</body>
      `, 'text/html');

      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: server.PREFIX + 'portable' },
      });
      await client.callTool({
        name: 'browser_set_local_storage',
        arguments: { key: 'portable-key', value: 'portable-value' },
      });
      await client.callTool({
        name: 'browser_save_profile',
        arguments: { name: sourceName, description: 'Portable round-trip source' },
      });

      const exportResult = await client.callTool({
        name: 'browser_export_session_state',
        arguments: { name: sourceName, filename: bundleName },
      });
      expect(exportResult).toContainTextContent(`Session state "${sourceName}" exported`);

      const duplicateExportResult = await client.callTool({
        name: 'browser_export_session_state',
        arguments: { name: sourceName, filename: bundleName },
      });
      expect(duplicateExportResult).toContainTextContent('Export file already exists');

      const bundlePath = path.join(outputDir, bundleName);
      const bundle = JSON.parse(await fs.promises.readFile(bundlePath, 'utf8'));
      expect(bundle.bundleVersion).toBe('1.0');
      expect(bundle.type).toBe('darbot-session-state-bundle');
      expect(bundle.profile.name).toBe(sourceName);
      expect(bundle.storageState.origins).toContainEqual(expect.objectContaining({
        localStorage: expect.arrayContaining([
          expect.objectContaining({ name: 'portable-key', value: 'portable-value' }),
        ]),
      }));

      await client.callTool({
        name: 'browser_delete_profile',
        arguments: { name: sourceName },
      });
      await client.callTool({
        name: 'browser_set_local_storage',
        arguments: { key: 'portable-key', value: 'changed-after-export' },
      });

      const importResult = await client.callTool({
        name: 'browser_import_session_state',
        arguments: { filename: bundleName, name: importedName },
      });
      expect(importResult).toContainTextContent(`Session state "${importedName}" imported successfully`);
      expect(importResult).toContainTextContent('Storage state: Included');

      const duplicateResult = await client.callTool({
        name: 'browser_import_session_state',
        arguments: { filename: bundleName, name: importedName },
      });
      expect(duplicateResult).toContainTextContent(`Session state "${importedName}" already exists`);

      const switchResult = await client.callTool({
        name: 'browser_switch_profile',
        arguments: { name: importedName },
      });
      expect(switchResult).toContainTextContent('**Storage:** Fully restored');

      const storageResult = await client.callTool({
        name: 'browser_get_local_storage',
        arguments: {},
      });
      expect(storageResult).toContainTextContent('portable-key');
      expect(storageResult).toContainTextContent('portable-value');
    } finally {
      await removeSessionState(sourceName);
      await removeSessionState(importedName);
    }
  });

  test('workspace metadata import is session-scoped and recorded in saved states', async ({ startClient, server }, testInfo) => {
    const outputDir = testInfo.outputPath('workspace-metadata');
    const workspaceFilename = 'darbot.code-workspace';
    const profileName = `workspace-import-${Date.now()}`;
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(path.join(outputDir, workspaceFilename), `{
      // JSONC comments and trailing commas are accepted.
      "folders": [
        { "name": "Browser", "path": "src" },
        { "uri": "vscode-remote://ssh-remote+dev/workspaces/browser" },
      ],
      "settings": {
        "editor.formatOnSave": true,
        "typescript.tsdk": "node_modules/typescript/lib",
      },
      "extensions": {
        "recommendations": ["dbaeumer.vscode-eslint"],
      },
      "remoteAuthority": "ssh-remote+dev",
    }`);

    const { client } = await startClient({
      args: ['--output-dir', outputDir],
    });

    try {
      const importResult = await client.callTool({
        name: 'browser_import_workspace_metadata',
        arguments: { filename: workspaceFilename, name: 'Darbot Browser Workspace' },
      });
      expect(importResult).toContainTextContent('Workspace metadata "Darbot Browser Workspace" imported');
      expect(importResult).toContainTextContent('Folders: 2');
      expect(importResult).toContainTextContent('Setting keys recorded: 2');
      expect(importResult).toContainTextContent('were not executed or applied');

      server.setContent('/workspace', '<title>Workspace Metadata</title><body>Workspace metadata</body>', 'text/html');
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: server.PREFIX + 'workspace' },
      });
      await client.callTool({
        name: 'browser_save_profile',
        arguments: { name: profileName },
      });

      const profilePath = path.join(getSessionStatesDir(), profileName, 'profile.json');
      const profile = JSON.parse(await fs.promises.readFile(profilePath, 'utf8'));
      expect(profile.workspace).toEqual({
        name: 'Darbot Browser Workspace',
        path: path.join(outputDir, workspaceFilename),
        folders: [
          { name: 'Browser', path: 'src' },
          { uri: 'vscode-remote://ssh-remote+dev/workspaces/browser' },
        ],
        settingKeys: ['editor.formatOnSave', 'typescript.tsdk'],
        extensionRecommendations: ['dbaeumer.vscode-eslint'],
        remoteAuthority: 'ssh-remote+dev',
      });
    } finally {
      await removeSessionState(profileName);
    }
  });

  test('portable imports reject filesystem paths outside the output directory', async ({ client }) => {
    const result = await client.callTool({
      name: 'browser_import_session_state',
      arguments: { filename: '../session-state.json' },
    });

    expect(result).toContainTextContent('Use a filename only');
  });
});
