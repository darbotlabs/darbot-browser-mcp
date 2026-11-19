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
});
