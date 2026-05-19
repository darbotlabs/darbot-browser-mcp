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

/**
 * Session-state snapshot tools and Edge profile discovery.
 *
 * ## Reconciliation note
 *
 * GitHub and ADO both shipped this module with the same `browserSaveProfile`
 * / `browserSwitchProfile` / `browserListProfiles` / `browserDeleteProfile`
 * exports, but GitHub additionally introduced `browserDiscoverProfiles`
 * (real Edge profile enumeration) and updated every description to clarify
 * "session state snapshot" vs. real Edge browser profile. We adopt the
 * GitHub surface as canonical; the only ADO-side carry-over was the
 * `DARBOT_WORKSPACE` env precedence for workspace detection, which is
 * preserved here.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

import { defineTool } from './tool.js';
import { sanitizeForFilePath } from './utils.js';

import type { Context } from '../context.js';

/** Persisted shape of a saved Darbot session state. */
interface SavedProfileData {
  version: '2.0';
  type: 'darbot-session-state';
  edgeProfile: {
    name: string;
    email?: string;
  };
  workspace?: {
    path: string;
    name: string;
  };
  name: string;
  description: string;
  created: string;
  url: string;
  title: string;
}

/** Discovered real Edge browser profile (from `User Data/Preferences`). */
interface DiscoveredEdgeProfile {
  folder: string;
  name: string;
  email?: string;
}

const saveProfileSchema = z.object({
  name: z.string().min(1).describe('Name for the session state snapshot. Used as both the display name and the on-disk folder name (sanitized).'),
  description: z.string().optional().describe('Optional human-readable description of what this snapshot captures.'),
});

const switchProfileSchema = z.object({
  name: z.string().min(1).describe('Name of the previously saved session state snapshot to restore.'),
});

const listProfilesSchema = z.object({}).describe('No input parameters.');

const deleteProfileSchema = z.object({
  name: z.string().min(1).describe('Name of the session state snapshot to permanently delete.'),
});

const discoverProfilesSchema = z.object({
  userDataDir: z.string().optional().describe('Optional path to a Microsoft Edge `User Data` directory. Defaults to the standard platform location (LOCALAPPDATA on Windows, ~/Library/Application Support on macOS, ~/.config on Linux).'),
});

async function getProfilesDir(): Promise<string> {
  let profilesDir: string;
  if (process.platform === 'linux')
    profilesDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  else if (process.platform === 'darwin')
    profilesDir = path.join(os.homedir(), 'Library', 'Application Support');
  else if (process.platform === 'win32')
    profilesDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  else
    throw new Error('Unsupported platform: ' + process.platform);

  const result = path.join(profilesDir, 'darbot-browser-mcp', 'session-states');
  await fs.promises.mkdir(result, { recursive: true });
  return result;
}

async function saveCurrentProfile(context: Context, profileName: string, description?: string): Promise<SavedProfileData> {
  const profilesDir = await getProfilesDir();
  const sanitizedName = sanitizeForFilePath(profileName);
  const profileDir = path.join(profilesDir, sanitizedName);

  await fs.promises.mkdir(profileDir, { recursive: true });

  // Get current browser state
  const tab = context.currentTabOrDie();
  const url = tab.page.url();
  const title = await tab.title();

  // Detect Edge profile info from environment/config
  const edgeProfile = process.env.DARBOT_EDGE_PROFILE || 'default';
  const edgeProfileEmail = process.env.DARBOT_EDGE_PROFILE_EMAIL || undefined;
  // DARBOT_WORKSPACE wins over VS Code / shell auto-detection. This is the
  // ADO-side improvement carried into the canonical surface.
  const workspacePath = process.env.DARBOT_WORKSPACE || process.env.VSCODE_WORKSPACE_FOLDER || process.env.PWD || undefined;
  const workspaceName = workspacePath ? path.basename(workspacePath) : undefined;

  const profileData: SavedProfileData = {
    version: '2.0',
    type: 'darbot-session-state',
    edgeProfile: {
      name: edgeProfile,
      ...(edgeProfileEmail !== undefined && { email: edgeProfileEmail }),
    },
    ...(workspacePath && workspaceName && { workspace: { path: workspacePath, name: workspaceName } }),
    name: profileName,
    description: description || '',
    created: new Date().toISOString(),
    url,
    title,
  };

  await fs.promises.writeFile(
      path.join(profileDir, 'profile.json'),
      JSON.stringify(profileData, null, 2)
  );

  // Save storage state (cookies, localStorage, etc.). We don't fail the whole
  // operation if storage capture is unavailable — the URL/title metadata is
  // still useful on its own.
  try {
    const storageState = await tab.page.context().storageState();
    await fs.promises.writeFile(
        path.join(profileDir, 'storage-state.json'),
        JSON.stringify(storageState, null, 2)
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[profiles] Failed to save storage state for "${profileName}":`, error);
  }

  return profileData;
}

async function loadProfile(context: Context, profileName: string): Promise<{ profileData: SavedProfileData; restored: boolean }> {
  const profilesDir = await getProfilesDir();
  const sanitizedName = sanitizeForFilePath(profileName);
  const profileDir = path.join(profilesDir, sanitizedName);
  try {
    await fs.promises.access(profileDir);
  } catch {
    throw new Error(`Session state "${profileName}" not found`);
  }

  const profileDataPath = path.join(profileDir, 'profile.json');
  const profileData: SavedProfileData = JSON.parse(await fs.promises.readFile(profileDataPath, 'utf8'));

  // Try to restore full storage state when available.
  const storageStatePath = path.join(profileDir, 'storage-state.json');
  try {
    await fs.promises.access(storageStatePath);
    const storageState = JSON.parse(await fs.promises.readFile(storageStatePath, 'utf8'));

    const tab = await context.ensureTab();
    const currentContext = tab.page.context();
    // Capture the browser handle BEFORE closing the context — otherwise the
    // subsequent `.context().browser()` call would target a closed context
    // and lose its browser reference. (Reconciled bug fix vs. both sides.)
    const browser = currentContext.browser();

    if (currentContext)
      await currentContext.close();

    const newContext = await browser?.newContext({
      storageState,
      viewport: null,
    });

    if (newContext) {
      const newPage = await newContext.newPage();
      await newPage.goto(profileData.url);
      return { profileData, restored: true };
    }
  } catch (error) {
    // Storage state unavailable or restore failed — fall back to URL-only restore.
    // eslint-disable-next-line no-console
    console.warn(`[profiles] Falling back to URL-only restore for "${profileName}":`, error instanceof Error ? error.message : error);
  }

  const tab = await context.ensureTab();
  await tab.page.goto(profileData.url);
  return { profileData, restored: false };
}

async function listProfiles(): Promise<SavedProfileData[]> {
  const profilesDir = await getProfilesDir();
  const profiles: SavedProfileData[] = [];

  try {
    const entries = await fs.promises.readdir(profilesDir);
    for (const entry of entries) {
      const profileDir = path.join(profilesDir, entry);
      const stat = await fs.promises.stat(profileDir);
      if (!stat.isDirectory())
        continue;

      const profileDataPath = path.join(profileDir, 'profile.json');
      try {
        await fs.promises.access(profileDataPath);
        const profileData: SavedProfileData = JSON.parse(await fs.promises.readFile(profileDataPath, 'utf8'));
        profiles.push(profileData);
      } catch {
        // Entry isn't a valid saved profile — skip it without failing the whole listing.
      }
    }
  } catch {
    // Profiles directory doesn't exist yet — that just means no profiles saved.
    return [];
  }

  return profiles;
}

async function deleteProfile(profileName: string): Promise<void> {
  const profilesDir = await getProfilesDir();
  const sanitizedName = sanitizeForFilePath(profileName);
  const profileDir = path.join(profilesDir, sanitizedName);
  try {
    await fs.promises.access(profileDir);
  } catch {
    throw new Error(`Session state "${profileName}" not found`);
  }

  await fs.promises.rm(profileDir, { recursive: true, force: true });
}

/**
 * Save the current browser session state (cookies, localStorage, URL) as a
 * named on-disk snapshot. This is *not* a real Edge browser profile; use
 * `browser_discover_profiles` to enumerate those.
 *
 * @example
 * await browser_save_profile({ name: 'github-logged-in', description: 'Signed in to github.com' });
 */
export const browserSaveProfile = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_save_profile',
    title: 'Save session state snapshot',
    description: 'Save a snapshot of the current browser session state (cookies, localStorage, current URL) to disk for later restoration. This saves a session snapshot — not an actual Edge browser profile. Use browser_discover_profiles to list real Edge browser profiles on this machine.',
    inputSchema: saveProfileSchema,
    type: 'destructive',
  },
  handle: async (context: Context, { name, description }: z.infer<typeof saveProfileSchema>) => {
    const profileData = await saveCurrentProfile(context, name, description);

    let text = `Session state "${name}" saved successfully.\n\n`;
    text += `### Session State Details\n`;
    text += `- **Name:** ${profileData.name}\n`;
    if (profileData.description)
      text += `- **Description:** ${profileData.description}\n`;
    text += `- **URL:** ${profileData.url}\n`;
    text += `- **Title:** ${profileData.title}\n`;
    text += `- **Created:** ${profileData.created}\n\n`;
    text += `### Context\n`;
    text += `- **Edge Profile:** ${profileData.edgeProfile.name}${profileData.edgeProfile.email ? ` (${profileData.edgeProfile.email})` : ''}\n`;
    if (profileData.workspace)
      text += `- **VS Code Workspace:** ${profileData.workspace.name} (${profileData.workspace.path})\n`;

    return {
      code: [`await browser_save_profile({ name: '${name}', description: '${description || ''}' })`],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text,
        }],
      },
    };
  },
});

/**
 * Restore a previously saved session state snapshot, including cookies,
 * localStorage, and navigating to the saved URL.
 *
 * @example
 * await browser_switch_profile({ name: 'github-logged-in' });
 */
export const browserSwitchProfile = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_switch_profile',
    title: 'Restore session state snapshot',
    description: 'Restore a previously saved session state snapshot, including cookies, localStorage, and navigate to the saved URL. This restores a session snapshot — not an actual Edge browser profile. Use browser_discover_profiles to list real Edge browser profiles on this machine.',
    inputSchema: switchProfileSchema,
    type: 'destructive',
  },
  handle: async (context: Context, { name }: z.infer<typeof switchProfileSchema>) => {
    const result = await loadProfile(context, name);
    const pd = result.profileData;

    let text = `Session state "${name}" restored.\n\n`;
    text += `### Session State Details\n`;
    text += `- **Name:** ${pd.name}\n`;
    if (pd.description)
      text += `- **Description:** ${pd.description}\n`;
    text += `- **URL:** ${pd.url}\n`;
    text += `- **Title:** ${pd.title}\n`;
    text += `- **Storage:** ${result.restored ? 'Fully restored' : 'URL only (storage not available)'}\n\n`;
    if (pd.edgeProfile) {
      text += `### Original Context\n`;
      text += `- **Edge Profile:** ${pd.edgeProfile.name}${pd.edgeProfile.email ? ` (${pd.edgeProfile.email})` : ''}\n`;
    }
    if (pd.workspace)
      text += `- **VS Code Workspace:** ${pd.workspace.name}\n`;

    return {
      code: [`await browser_switch_profile({ name: '${name}' })`],
      action: async () => ({ content: [] }),
      captureSnapshot: true,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text,
        }],
      },
    };
  },
});

/**
 * List all saved Darbot session state snapshots.
 *
 * @example
 * await browser_list_profiles({});
 */
export const browserListProfiles = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_list_profiles',
    title: 'List session state snapshots',
    description: 'List all saved Darbot session state snapshots with their Edge profile context and workspace information. These are session snapshots (cookies, localStorage, URL), not actual Edge browser profiles. Use browser_discover_profiles to list real Edge browser profiles.',
    inputSchema: listProfilesSchema,
    type: 'readOnly',
  },
  handle: async (_context: Context, _params: z.infer<typeof listProfilesSchema>) => {
    const profiles = await listProfiles();

    let text = '### Saved Darbot Session States\n\n';

    if (profiles.length === 0) {
      text += 'No session states saved yet. Use the "browser_save_profile" tool to save your current browser session state.';
    } else {
      for (const profile of profiles) {
        text += `**${profile.name}**\n`;
        if (profile.description)
          text += `- Description: ${profile.description}\n`;
        text += `- URL: ${profile.url}\n`;
        text += `- Title: ${profile.title}\n`;
        text += `- Created: ${new Date(profile.created).toLocaleString()}\n`;
        if (profile.edgeProfile)
          text += `- Edge Profile: ${profile.edgeProfile.name}${profile.edgeProfile.email ? ` (${profile.edgeProfile.email})` : ''}\n`;
        if (profile.workspace)
          text += `- Workspace: ${profile.workspace.name}\n`;
        text += '\n';
      }
    }

    return {
      code: ['await browser_list_profiles()'],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text,
        }],
      },
    };
  },
});

/**
 * Permanently delete a saved session state snapshot from disk.
 *
 * @example
 * await browser_delete_profile({ name: 'stale-snapshot' });
 */
export const browserDeleteProfile = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_delete_profile',
    title: 'Delete session state snapshot',
    description: 'Permanently delete a saved session state snapshot from storage.',
    inputSchema: deleteProfileSchema,
    type: 'destructive',
  },
  handle: async (_context: Context, { name }: z.infer<typeof deleteProfileSchema>) => {
    await deleteProfile(name);

    return {
      code: [`await browser_delete_profile({ name: '${name}' })`],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text: `Session state "${name}" deleted successfully.`,
        }],
      },
    };
  },
});

/**
 * Discover real Microsoft Edge browser profiles by reading the per-platform
 * `User Data` directory. Falls back to enumerating folder names when the
 * Preferences file is unreadable.
 */
async function discoverEdgeProfiles(userDataDir?: string): Promise<DiscoveredEdgeProfile[]> {
  const candidates: string[] = [];

  if (userDataDir) {
    candidates.push(userDataDir);
  } else {
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      candidates.push(path.join(localAppData, 'Microsoft', 'Edge', 'User Data'));
    } else if (process.platform === 'darwin') {
      candidates.push(path.join(os.homedir(), 'Library', 'Application Support', 'Microsoft Edge'));
    } else {
      candidates.push(path.join(os.homedir(), '.config', 'microsoft-edge'));
    }
  }

  const profiles: DiscoveredEdgeProfile[] = [];

  for (const dataDir of candidates) {
    try {
      await fs.promises.access(dataDir);
    } catch {
      continue;
    }

    const entries = await fs.promises.readdir(dataDir);
    // Natural sort so 'Profile 2' lists before 'Profile 10'. The default
    // ASCII readdir order on Windows/Linux returns 'Profile 10' first, which
    // breaks users skimming the list as well as our sort-order test.
    entries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    for (const entry of entries) {
      // Edge profile folders are named 'Default' or 'Profile N'.
      if (entry !== 'Default' && !/^Profile \d+$/.test(entry))
        continue;

      const prefsPath = path.join(dataDir, entry, 'Preferences');
      try {
        const prefsRaw = await fs.promises.readFile(prefsPath, 'utf8');
        const prefs = JSON.parse(prefsRaw);
        const accountInfo = prefs?.account_info?.[0];
        const profileName: string = prefs?.profile?.name || entry;
        const email: string | undefined = accountInfo?.email
          || prefs?.signin?.allowed_domain_profile_info?.email
          || undefined;

        profiles.push({
          folder: path.join(dataDir, entry),
          name: profileName,
          ...(email !== undefined && { email }),
        });
      } catch {
        // Preferences file unreadable or missing — still include the folder with limited info.
        profiles.push({
          folder: path.join(dataDir, entry),
          name: entry,
        });
      }
    }
  }

  return profiles;
}

/**
 * Enumerate real Microsoft Edge browser profiles installed on this machine.
 *
 * Returns each profile's folder name, full path, display name, and (when
 * available) the associated email address. Use the parent directory as
 * `--user-data-dir` and the folder name as `--edge-profile` when starting
 * the MCP server.
 *
 * @example
 * await browser_discover_profiles({});
 */
export const browserDiscoverProfiles = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_discover_profiles',
    title: 'Discover Edge browser profiles',
    description: 'List real Microsoft Edge browser profiles installed on this machine, showing each profile\'s folder path, display name, and associated email address. Use the folder name with --edge-profile and the data directory with --user-data-dir when starting the MCP server. These are actual Edge browser profiles, not session state snapshots.',
    inputSchema: discoverProfilesSchema,
    type: 'readOnly',
  },
  handle: async (_context: Context, { userDataDir }: z.infer<typeof discoverProfilesSchema>) => {
    const profiles = await discoverEdgeProfiles(userDataDir);

    let text = '### Discovered Microsoft Edge Browser Profiles\n\n';

    if (profiles.length === 0) {
      text += 'No Edge browser profiles found.\n\n';
      text += 'Checked the default Edge user data directory for this platform.\n';
      text += 'You can specify a custom path with the `userDataDir` parameter.';
    } else {
      for (const profile of profiles) {
        const folderName = path.basename(profile.folder);
        text += `**${profile.name}**\n`;
        text += `- Folder: \`${folderName}\`\n`;
        text += `- Full path: \`${profile.folder}\`\n`;
        if (profile.email)
          text += `- Email: ${profile.email}\n`;
        text += '\n';
      }

      text += '---\n';
      text += 'To use a profile, start the MCP server with:\n';
      text += '```\n';
      text += `--user-data-dir "<parent of folder above>" --edge-profile "<Folder>"\n`;
      text += '```\n';
    }

    return {
      code: ['await browser_discover_profiles()'],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text,
        }],
      },
    };
  },
});
