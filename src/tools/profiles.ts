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

import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { parse as parseJsonc, printParseErrorCode, type ParseError } from 'jsonc-parser';

import { defineTool } from './tool.js';
import { sanitizeForFilePath } from './utils.js';

import type { BrowserContext } from 'playwright';
import type { Context, WorkspaceFolderMetadata, WorkspaceMetadata } from '../context.js';

/** Persisted shape of a saved Darbot session state. */
interface SavedProfileData {
  version: '2.0';
  type: 'darbot-session-state';
  edgeProfile: {
    name: string;
    email?: string;
  };
  workspace?: WorkspaceMetadata;
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

type PortableStorageState = Exclude<Parameters<BrowserContext['setStorageState']>[0], string>;

const profileNameSchema = z.string()
    .min(1)
    .max(200)
    .refine(name => {
      const sanitized = sanitizeForFilePath(name);
      return sanitized !== '' && sanitized !== '.' && sanitized !== '..';
    }, 'Name must contain at least one filename-safe character.');

const saveProfileSchema = z.object({
  name: profileNameSchema.describe('Name for the session state snapshot. Used as both the display name and the on-disk folder name (sanitized).'),
  description: z.string().optional().describe('Optional human-readable description of what this snapshot captures.'),
});

const switchProfileSchema = z.object({
  name: profileNameSchema.describe('Name of the previously saved session state snapshot to restore.'),
});

const listProfilesSchema = z.object({}).describe('No input parameters.');

const deleteProfileSchema = z.object({
  name: profileNameSchema.describe('Name of the session state snapshot to permanently delete.'),
});

const discoverProfilesSchema = z.object({
  userDataDir: z.string().optional().describe('Optional path to a Microsoft Edge `User Data` directory. Defaults to the standard platform location (LOCALAPPDATA on Windows, ~/Library/Application Support on macOS, ~/.config on Linux).'),
});

const artifactFileNameSchema = z.string()
    .min(1)
    .max(255)
    .regex(/^[A-Za-z0-9._-]+$/, 'Use a filename only, containing letters, numbers, dots, underscores, or hyphens.')
    .refine(name => name !== '.' && name !== '..', 'Filename must not be "." or "..".');

const workspaceFolderMetadataSchema = z.object({
  name: z.string().optional(),
  path: z.string().optional(),
  uri: z.string().optional(),
}).refine(folder => folder.path !== undefined || folder.uri !== undefined, {
  message: 'Each workspace folder must define path or uri.',
}).transform((folder): WorkspaceFolderMetadata => ({
  ...(folder.name !== undefined && { name: folder.name }),
  ...(folder.path !== undefined && { path: folder.path }),
  ...(folder.uri !== undefined && { uri: folder.uri }),
}));

const workspaceMetadataSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  folders: z.array(workspaceFolderMetadataSchema).optional(),
  settingKeys: z.array(z.string()).optional(),
  extensionRecommendations: z.array(z.string()).optional(),
  remoteAuthority: z.string().optional(),
}).transform((workspace): WorkspaceMetadata => ({
  name: workspace.name,
  path: workspace.path,
  ...(workspace.folders !== undefined && { folders: workspace.folders }),
  ...(workspace.settingKeys !== undefined && { settingKeys: workspace.settingKeys }),
  ...(workspace.extensionRecommendations !== undefined && { extensionRecommendations: workspace.extensionRecommendations }),
  ...(workspace.remoteAuthority !== undefined && { remoteAuthority: workspace.remoteAuthority }),
}));

const savedProfileDataSchema = z.object({
  version: z.literal('2.0'),
  type: z.literal('darbot-session-state'),
  edgeProfile: z.object({
    name: z.string().min(1),
    email: z.string().optional(),
  }),
  workspace: workspaceMetadataSchema.optional(),
  name: profileNameSchema,
  description: z.string(),
  created: z.string().min(1),
  url: z.string().min(1),
  title: z.string(),
}).transform((profile): SavedProfileData => ({
  version: profile.version,
  type: profile.type,
  edgeProfile: {
    name: profile.edgeProfile.name,
    ...(profile.edgeProfile.email !== undefined && { email: profile.edgeProfile.email }),
  },
  ...(profile.workspace !== undefined && { workspace: profile.workspace }),
  name: profile.name,
  description: profile.description,
  created: profile.created,
  url: profile.url,
  title: profile.title,
}));

const storageStateSchema = z.object({
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string(),
    path: z.string(),
    expires: z.number(),
    httpOnly: z.boolean(),
    secure: z.boolean(),
    sameSite: z.enum(['Strict', 'Lax', 'None']),
  }).passthrough()),
  origins: z.array(z.object({
    origin: z.string(),
    localStorage: z.array(z.object({
      name: z.string(),
      value: z.string(),
    }).passthrough()),
  }).passthrough()),
}).passthrough();

const sessionStateBundleSchema = z.object({
  bundleVersion: z.literal('1.0'),
  type: z.literal('darbot-session-state-bundle'),
  exportedAt: z.string().min(1),
  profile: savedProfileDataSchema,
  storageState: storageStateSchema.optional(),
});

const exportSessionStateSchema = z.object({
  name: profileNameSchema.describe('Name of the saved session state to export.'),
  filename: artifactFileNameSchema.optional().describe('Output filename inside the configured output directory. Defaults to `<name>.darbot-session-state.json`.'),
  overwrite: z.boolean().optional().default(false).describe('Replace an existing output bundle with the same filename. Defaults to false.'),
});

const importSessionStateSchema = z.object({
  filename: artifactFileNameSchema.describe('Portable session-state bundle filename inside the configured output directory. Paths and directory traversal are not accepted.'),
  name: profileNameSchema.optional().describe('Optional destination name. Defaults to the name stored in the bundle.'),
  overwrite: z.boolean().optional().default(false).describe('Replace an existing saved session state with the same destination name. Defaults to false.'),
});

const workspaceFileSchema = z.object({
  folders: z.array(z.object({
    name: z.string().optional(),
    path: z.string().optional(),
    uri: z.string().optional(),
  }).refine(folder => folder.path !== undefined || folder.uri !== undefined, {
    message: 'Each workspace folder must define path or uri.',
  })).optional().default([]),
  settings: z.record(z.string(), z.unknown()).optional(),
  extensions: z.object({
    recommendations: z.array(z.string()).optional(),
  }).optional(),
  remoteAuthority: z.string().optional(),
}).passthrough();

const importWorkspaceMetadataSchema = z.object({
  filename: artifactFileNameSchema.describe('JSON or `.code-workspace` filename inside the configured output directory. Paths and directory traversal are not accepted.'),
  name: z.string().min(1).max(200).optional().describe('Optional display name. Defaults to the workspace filename without its extension.'),
});

const MAX_SESSION_STATE_BUNDLE_BYTES = 50 * 1024 * 1024;
const MAX_WORKSPACE_FILE_BYTES = 2 * 1024 * 1024;

async function artifactPath(context: Context, filename: string): Promise<string> {
  const outputDir = managedDirectoryForContext(context, context.config.outputDir);
  await fs.promises.mkdir(outputDir, { recursive: true, mode: 0o700 });
  return path.join(outputDir, filename);
}

function sanitizedProfileName(profileName: string): string {
  const sanitizedName = sanitizeForFilePath(profileName);
  if (!sanitizedName || sanitizedName === '.' || sanitizedName === '..')
    throw new Error('Session-state name must contain at least one filename-safe character.');
  return sanitizedName;
}

function managedDirectoryForContext(context: Context, baseDir: string): string {
  const namespace = context.storageNamespace();
  if (namespace === 'local' || namespace === 'anonymous')
    return baseDir;
  const namespaceHash = crypto.createHash('sha256').update(namespace).digest('hex').slice(0, 32);
  return path.join(baseDir, 'principals', namespaceHash);
}

async function getProfilesDir(context: Context): Promise<string> {
  const configuredDir = process.env.DARBOT_SESSION_STATE_DIR;
  if (configuredDir) {
    const result = managedDirectoryForContext(context, path.resolve(configuredDir));
    await fs.promises.mkdir(result, { recursive: true, mode: 0o700 });
    return result;
  }

  let profilesDir: string;
  if (process.platform === 'linux')
    profilesDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  else if (process.platform === 'darwin')
    profilesDir = path.join(os.homedir(), 'Library', 'Application Support');
  else if (process.platform === 'win32')
    profilesDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  else
    throw new Error('Unsupported platform: ' + process.platform);

  const result = managedDirectoryForContext(context, path.join(profilesDir, 'darbot-browser-mcp', 'session-states'));
  await fs.promises.mkdir(result, { recursive: true, mode: 0o700 });
  return result;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return false;
    throw error;
  }
}

function parseJson(raw: string, description: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${description}: ${message}`, { cause: error });
  }
}

async function readBoundedFile(filePath: string, maxBytes: number, description: string): Promise<string> {
  const stat = await fs.promises.lstat(filePath);
  if (stat.isSymbolicLink())
    throw new Error(`${description} must not be a symbolic link: ${filePath}`);
  if (!stat.isFile())
    throw new Error(`${description} is not a file: ${filePath}`);
  if (stat.size > maxBytes)
    throw new Error(`${description} exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MiB import limit.`);
  return await fs.promises.readFile(filePath, 'utf8');
}

async function profileDirForName(context: Context, profileName: string): Promise<string> {
  return path.join(await getProfilesDir(context), sanitizedProfileName(profileName));
}

async function readProfileData(profileDir: string): Promise<SavedProfileData> {
  const profileDataPath = path.join(profileDir, 'profile.json');
  const raw = await fs.promises.readFile(profileDataPath, 'utf8');
  return savedProfileDataSchema.parse(parseJson(raw, profileDataPath));
}

async function readStorageState(profileDir: string): Promise<PortableStorageState | undefined> {
  const storageStatePath = path.join(profileDir, 'storage-state.json');
  if (!(await pathExists(storageStatePath)))
    return undefined;
  const raw = await fs.promises.readFile(storageStatePath, 'utf8');
  return storageStateSchema.parse(parseJson(raw, storageStatePath));
}

async function saveCurrentProfile(context: Context, profileName: string, description?: string): Promise<SavedProfileData> {
  const profilesDir = await getProfilesDir(context);
  const sanitizedName = sanitizedProfileName(profileName);
  const profileDir = path.join(profilesDir, sanitizedName);

  await fs.promises.mkdir(profileDir, { recursive: true, mode: 0o700 });

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
  const importedWorkspace = context.workspaceMetadata();

  const profileData: SavedProfileData = {
    version: '2.0',
    type: 'darbot-session-state',
    edgeProfile: {
      name: edgeProfile,
      ...(edgeProfileEmail !== undefined && { email: edgeProfileEmail }),
    },
    ...(importedWorkspace
      ? { workspace: importedWorkspace }
      : workspacePath && workspaceName
        ? { workspace: { path: workspacePath, name: workspaceName } }
        : {}),
    name: profileName,
    description: description || '',
    created: new Date().toISOString(),
    url,
    title,
  };

  await fs.promises.writeFile(
      path.join(profileDir, 'profile.json'),
      JSON.stringify(profileData, null, 2),
      { mode: 0o600 }
  );

  // Save storage state (cookies, localStorage, etc.). We don't fail the whole
  // operation if storage capture is unavailable — the URL/title metadata is
  // still useful on its own.
  try {
    const storageState = await tab.page.context().storageState();
    await fs.promises.writeFile(
        path.join(profileDir, 'storage-state.json'),
        JSON.stringify(storageState, null, 2),
        { mode: 0o600 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[profiles] Failed to save storage state for "${profileName}":`, error);
  }

  return profileData;
}

async function loadProfile(context: Context, profileName: string): Promise<{ profileData: SavedProfileData; restored: boolean }> {
  const profileDir = await profileDirForName(context, profileName);
  if (!(await pathExists(profileDir)))
    throw new Error(`Session state "${profileName}" not found`);

  const profileData = await readProfileData(profileDir);
  if (profileData.workspace)
    context.setWorkspaceMetadata(profileData.workspace);

  const storageState = await readStorageState(profileDir);
  if (storageState) {
    const tab = await context.ensureTab();
    try {
      await tab.page.context().setStorageState(storageState);
      await tab.page.goto(profileData.url);
      return { profileData, restored: true };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[profiles] Falling back to URL-only restore for "${profileName}":`, error instanceof Error ? error.message : error);
    }
  }

  const tab = await context.ensureTab();
  await tab.page.goto(profileData.url);
  return { profileData, restored: false };
}

async function listProfiles(context: Context): Promise<SavedProfileData[]> {
  const profilesDir = await getProfilesDir(context);
  const profiles: SavedProfileData[] = [];

  try {
    const entries = await fs.promises.readdir(profilesDir);
    for (const entry of entries) {
      const profileDir = path.join(profilesDir, entry);
      const stat = await fs.promises.stat(profileDir);
      if (!stat.isDirectory())
        continue;

      try {
        const profileData = await readProfileData(profileDir);
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

async function deleteProfile(context: Context, profileName: string): Promise<void> {
  const profileDir = await profileDirForName(context, profileName);
  if (!(await pathExists(profileDir)))
    throw new Error(`Session state "${profileName}" not found`);

  await fs.promises.rm(profileDir, { recursive: true, force: true });
}

async function writeImportedProfile(context: Context, profileData: SavedProfileData, storageState: PortableStorageState | undefined, overwrite: boolean): Promise<string> {
  const profilesDir = await getProfilesDir(context);
  const targetDir = path.join(profilesDir, sanitizedProfileName(profileData.name));
  const targetExists = await pathExists(targetDir);
  if (targetExists && !overwrite)
    throw new Error(`Session state "${profileData.name}" already exists. Set overwrite=true to replace it.`);

  const tempDir = await fs.promises.mkdtemp(path.join(profilesDir, '.import-'));
  try {
    await fs.promises.writeFile(
        path.join(tempDir, 'profile.json'),
        JSON.stringify(profileData, null, 2),
        { mode: 0o600 }
    );
    if (storageState) {
      await fs.promises.writeFile(
          path.join(tempDir, 'storage-state.json'),
          JSON.stringify(storageState, null, 2),
          { mode: 0o600 }
      );
    }

    if (targetExists)
      await fs.promises.rm(targetDir, { recursive: true, force: true });
    await fs.promises.rename(tempDir, targetDir);
    return targetDir;
  } catch (error) {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Export a saved session state as one portable JSON bundle inside the
 * configured output directory.
 */
export const browserExportSessionState = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_export_session_state',
    title: 'Export session state bundle',
    description: 'Export a saved Darbot session state and its Playwright storage state as one portable JSON bundle in the configured output directory. The bundle can contain authentication cookies and must be protected as sensitive data.',
    inputSchema: exportSessionStateSchema,
    type: 'readOnly',
  },
  handle: async (context: Context, { name, filename, overwrite }: z.infer<typeof exportSessionStateSchema>) => {
    const profileDir = await profileDirForName(context, name);
    if (!(await pathExists(profileDir)))
      throw new Error(`Session state "${name}" not found`);

    const profile = await readProfileData(profileDir);
    const storageState = await readStorageState(profileDir);
    const outputName = filename ?? `${sanitizedProfileName(name)}.darbot-session-state.json`;
    const destination = await artifactPath(context, outputName);
    if (await pathExists(destination)) {
      const stat = await fs.promises.lstat(destination);
      if (stat.isSymbolicLink())
        throw new Error(`Export destination must not be a symbolic link: ${destination}`);
      if (!overwrite)
        throw new Error(`Export file already exists: ${destination}. Set overwrite=true to replace it.`);
    }
    const bundle = {
      bundleVersion: '1.0' as const,
      type: 'darbot-session-state-bundle' as const,
      exportedAt: new Date().toISOString(),
      profile,
      ...(storageState !== undefined && { storageState }),
    };

    await fs.promises.writeFile(destination, JSON.stringify(bundle, null, 2), {
      mode: 0o600,
      flag: overwrite ? 'w' : 'wx',
    });

    return {
      code: [`await browser_export_session_state(${JSON.stringify({ name, filename: outputName, overwrite })})`],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text: `Session state "${name}" exported to: ${destination}\n\nTreat this bundle as sensitive because it may contain reusable authentication cookies and local storage.`,
        }],
      },
    };
  },
});

/**
 * Import a portable Darbot session-state bundle from the configured output
 * directory into managed session-state storage.
 */
export const browserImportSessionState = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_import_session_state',
    title: 'Import session state bundle',
    description: 'Import a portable Darbot session-state bundle from a filename inside the configured output directory. Arbitrary filesystem paths are rejected.',
    inputSchema: importSessionStateSchema,
    type: 'destructive',
  },
  handle: async (context: Context, { filename, name, overwrite }: z.infer<typeof importSessionStateSchema>) => {
    const source = await artifactPath(context, filename);
    const raw = await readBoundedFile(source, MAX_SESSION_STATE_BUNDLE_BYTES, 'Session-state bundle');
    const bundle = sessionStateBundleSchema.parse(parseJson(raw, source));
    const importedProfile: SavedProfileData = {
      ...bundle.profile,
      ...(name !== undefined && { name }),
    };

    const destination = await writeImportedProfile(context, importedProfile, bundle.storageState, overwrite);

    return {
      code: [`await browser_import_session_state(${JSON.stringify({ filename, name, overwrite })})`],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text: `Session state "${importedProfile.name}" imported successfully.\n- Source: ${source}\n- Destination: ${destination}\n- Storage state: ${bundle.storageState ? 'Included' : 'Metadata only'}`,
        }],
      },
    };
  },
});

/**
 * Import safe metadata from a VS Code `.code-workspace` or JSON file. Settings
 * are not executed or applied; only their keys are recorded for context.
 */
export const browserImportWorkspaceMetadata = defineTool({
  capability: 'core' as const,
  schema: {
    name: 'browser_import_workspace_metadata',
    title: 'Import workspace metadata',
    description: 'Import folder and configuration metadata from a JSON or VS Code `.code-workspace` file in the configured output directory. The import is scoped to the current MCP session; settings, tasks, and extensions are not executed or applied.',
    inputSchema: importWorkspaceMetadataSchema,
    type: 'destructive',
  },
  handle: async (context: Context, { filename, name }: z.infer<typeof importWorkspaceMetadataSchema>) => {
    const source = await artifactPath(context, filename);
    const raw = await readBoundedFile(source, MAX_WORKSPACE_FILE_BYTES, 'Workspace file');
    const parseErrors: ParseError[] = [];
    const parsed = parseJsonc(raw, parseErrors, {
      allowTrailingComma: true,
      disallowComments: false,
    });
    if (parseErrors.length) {
      const details = parseErrors
          .map(error => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
          .join(', ');
      throw new Error(`Invalid workspace JSON in ${source}: ${details}`);
    }

    const workspace = workspaceFileSchema.parse(parsed);
    const defaultName = path.basename(filename).replace(/(?:\.code-workspace|\.json)$/i, '');
    const folders = workspace.folders.map(folder => ({
      ...(folder.name !== undefined && { name: folder.name }),
      ...(folder.path !== undefined && { path: folder.path }),
      ...(folder.uri !== undefined && { uri: folder.uri }),
    }));
    const settingKeys = Object.keys(workspace.settings ?? {}).sort();
    const extensionRecommendations = workspace.extensions?.recommendations ?? [];
    const metadata: WorkspaceMetadata = {
      name: name ?? defaultName,
      path: source,
      ...(folders.length > 0 && { folders }),
      ...(settingKeys.length > 0 && { settingKeys }),
      ...(extensionRecommendations.length > 0 && { extensionRecommendations }),
      ...(workspace.remoteAuthority !== undefined && { remoteAuthority: workspace.remoteAuthority }),
    };
    context.setWorkspaceMetadata(metadata);

    return {
      code: [`await browser_import_workspace_metadata(${JSON.stringify({ filename, name })})`],
      action: async () => ({ content: [] }),
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text: `Workspace metadata "${metadata.name}" imported for this MCP session.\n- Source: ${source}\n- Folders: ${folders.length}\n- Setting keys recorded: ${settingKeys.length}\n- Extension recommendations recorded: ${extensionRecommendations.length}\n\nWorkspace settings, tasks, and extensions were not executed or applied.`,
        }],
      },
    };
  },
});

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
  handle: async (context: Context, _params: z.infer<typeof listProfilesSchema>) => {
    const profiles = await listProfiles(context);

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
  handle: async (context: Context, { name }: z.infer<typeof deleteProfileSchema>) => {
    await deleteProfile(context, name);

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
