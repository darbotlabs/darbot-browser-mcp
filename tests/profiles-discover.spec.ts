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

import fs from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from './fixtures.js';

async function createProfile(userDataDir: string, folder: string, name: string, email?: string) {
  const profileDir = path.join(userDataDir, folder);
  await fs.mkdir(profileDir, { recursive: true });
  await fs.writeFile(path.join(profileDir, 'Preferences'), JSON.stringify({
    profile: { name },
    account_info: email ? [{ email }] : [],
  }));
}

test.describe('browser_discover_profiles', () => {
  test('it should return Edge profiles when a user data directory is present', async ({ client }, testInfo) => {
    const userDataDir = testInfo.outputPath('edge-user-data');
    await createProfile(userDataDir, 'Default', 'Personal', 'person@example.com');
    await createProfile(userDataDir, 'Profile 1', 'Work', 'work@example.com');

    const result = await client.callTool({
      name: 'browser_discover_profiles',
      arguments: { userDataDir },
    });

    expect(result).toContainTextContent('### Discovered Microsoft Edge Browser Profiles');
    expect(result).toContainTextContent('**Personal**');
    expect(result).toContainTextContent('- Folder: `Default`');
    expect(result).toContainTextContent('- Email: person@example.com');
    expect(result).toContainTextContent('**Work**');
    expect(result).toContainTextContent('- Folder: `Profile 1`');
  });

  test('it should return an empty list gracefully when no Edge data exists', async ({ client }, testInfo) => {
    const userDataDir = testInfo.outputPath('missing-edge-user-data');

    const result = await client.callTool({
      name: 'browser_discover_profiles',
      arguments: { userDataDir },
    });

    expect(result).toContainTextContent('No Edge browser profiles found.');
  });

  test('it should filter non-profile directories and sort profiles naturally', async ({ client }, testInfo) => {
    const userDataDir = testInfo.outputPath('sorted-edge-user-data');
    await createProfile(userDataDir, 'Profile 10', 'Ten');
    await createProfile(userDataDir, 'System Profile', 'Ignored');
    await createProfile(userDataDir, 'Profile 2', 'Two');
    await createProfile(userDataDir, 'Default', 'Default profile');

    const result = await client.callTool({
      name: 'browser_discover_profiles',
      arguments: { userDataDir },
    });
    const text = (result.content as any)[0].text as string;

    expect(text).not.toContain('Ignored');
    expect(text.indexOf('- Folder: `Default`')).toBeLessThan(text.indexOf('- Folder: `Profile 2`'));
    expect(text.indexOf('- Folder: `Profile 2`')).toBeLessThan(text.indexOf('- Folder: `Profile 10`'));
  });
});
