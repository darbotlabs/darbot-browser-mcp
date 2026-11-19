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

import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

import { defineTool } from './tool.js';
import { sanitizeForFilePath } from './utils.js';

import type { Context } from '../context.js';

const saveProfileSchema = z.object({
  name: z.string().describe('Name for the session state'),
  description: z.string().optional().describe('Optional description for the session state'),
});

const switchProfileSchema = z.object({
  name: z.string().describe('Name of the session state to restore'),
});

const listProfilesSchema = z.object({});

const deleteProfileSchema = z.object({
  name: z.string().describe('Name of the session state to delete'),
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

async function saveCurrentProfile(context: Context, profileName: string, description?: string) {
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
  // DARBOT_WORKSPACE takes precedence over auto-detected workspace paths
  const workspacePath = process.env.DARBOT_WORKSPACE || process.env.VSCODE_WORKSPACE_FOLDER || process.env.PWD || undefined;
  const workspaceName = workspacePath ? path.basename(workspacePath) : undefined;

  // Save session state metadata with unified header
  const profileData = {
    // Unified header
    version: '2.0',
    type: 'darbot-session-state',
    // Edge profile context
    edgeProfile: {
      name: edgeProfile,
      email: edgeProfileEmail,
    },
    // VS Code workspace context (if launched from VS Code)
    workspace: workspacePath ? {
      path: workspacePath,
      name: workspaceName,
    } : undefined,
    // Session state details
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

  // Save storage state (cookies, localStorage, etc.)
  try {
    const storageState = await tab.page.context().storageState();
    await fs.promises.writeFile(
        path.join(profileDir, 'storage-state.json'),
        JSON.stringify(storageState, null, 2)
    );
  } catch (error) {
    // Storage state save failed, but we can still save the profile
    // eslint-disable-next-line no-console
    console.warn('Failed to save storage state:', error);
  }

  return profileData;
}

async function loadProfile(context: Context, profileName: string) {
  const profilesDir = await getProfilesDir();
  const sanitizedName = sanitizeForFilePath(profileName);
  const profileDir = path.join(profilesDir, sanitizedName);
  try {
    await fs.promises.access(profileDir);
  } catch {
    throw new Error(`Session state "${profileName}" not found`);
  }

  // Load profile metadata
  const profileDataPath = path.join(profileDir, 'profile.json');
  const profileData = JSON.parse(await fs.promises.readFile(profileDataPath, 'utf8'));

  // Load storage state if available
  const storageStatePath = path.join(profileDir, 'storage-state.json');
  try {
    await fs.promises.access(storageStatePath);
    const storageState = JSON.parse(await fs.promises.readFile(storageStatePath, 'utf8'));

    // Create new context with the stored state
    const tab = await context.ensureTab();
    const currentContext = tab.page.context();
    if (currentContext)
      await currentContext.close();

    const newContext = await tab.page.context().browser()?.newContext({
      storageState,
      viewport: null,
    });

    if (newContext) {
      const newPage = await newContext.newPage();
      await newPage.goto(profileData.url);
      return { profileData, restored: true };
    }
  } catch {
    // Storage state not available or failed to load, fall through to fallback
  }

  // Fallback: just navigate to the URL
  const tab = await context.ensureTab();
  await tab.page.goto(profileData.url);
  return { profileData, restored: false };
}

async function listProfiles() {
  const profilesDir = await getProfilesDir();
  const profiles = [];

  try {
    const entries = await fs.promises.readdir(profilesDir);
    for (const entry of entries) {
      const profileDir = path.join(profilesDir, entry);
      const stat = await fs.promises.stat(profileDir);
      if (stat.isDirectory()) {
        const profileDataPath = path.join(profileDir, 'profile.json');
        try {
          await fs.promises.access(profileDataPath);
          const profileData = JSON.parse(await fs.promises.readFile(profileDataPath, 'utf8'));
          profiles.push(profileData);
        } catch {
          // File does not exist, skip this entry
        }
      }
    }
  } catch (error) {
    // Profiles directory doesn't exist yet
    return [];
  }

  return profiles;
}

async function deleteProfile(profileName: string) {
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

export const browserSaveProfile = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_save_profile',
    title: 'Save session state',
    description: 'Save the current browser session state (cookies, localStorage, URL) for later restoration. Includes Edge profile and VS Code workspace context.',
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

export const browserSwitchProfile = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_switch_profile',
    title: 'Restore session state',
    description: 'Restore a previously saved session state, including cookies, localStorage, and navigate to the saved URL',
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

export const browserListProfiles = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_list_profiles',
    title: 'List session states',
    description: 'List all saved Darbot session states with their Edge profile context and workspace information',
    inputSchema: listProfilesSchema,
    type: 'readOnly',
  },
  handle: async (context: Context, {}: z.infer<typeof listProfilesSchema>) => {
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
        // Show Edge profile context if available (v2.0+ session states)
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

export const browserDeleteProfile = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_delete_profile',
    title: 'Delete session state',
    description: 'Permanently delete a saved session state from storage',
    inputSchema: deleteProfileSchema,
    type: 'destructive',
  },
  handle: async (context: Context, { name }: z.infer<typeof deleteProfileSchema>) => {
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
