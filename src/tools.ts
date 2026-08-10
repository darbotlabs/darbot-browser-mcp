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

import common from './tools/common.js';
import console from './tools/console.js';
import dialogs from './tools/dialogs.js';
import evaluate from './tools/evaluate.js';
import files from './tools/files.js';
import install from './tools/install.js';
import keyboard from './tools/keyboard.js';
import navigate from './tools/navigate.js';
import network from './tools/network.js';
import pdf from './tools/pdf.js';
import * as profiles from './tools/profiles.js';
import snapshot from './tools/snapshot.js';
import tabs from './tools/tabs.js';
import screenshot from './tools/screenshot.js';
import testing from './tools/testing.js';
import vision from './tools/vision.js';
import wait from './tools/wait.js';
import aiNative from './tools/ai-native.js';
import autonomous from './tools/autonomous.js';
import scroll from './tools/scroll.js';
import clock from './tools/clock.js';
import emulation from './tools/emulation.js';
import diagnostics from './tools/diagnostics.js';
import storage from './tools/storage.js';
import workflowManagement from './tools/workflow-management.js';

import type { Tool } from './tools/tool.js';

export const snapshotTools: Tool<any>[] = [
  ...common(true),
  ...console,
  ...dialogs(true),
  ...evaluate,
  ...files(true),
  ...install,
  ...keyboard(true),
  ...navigate(true),
  ...network,
  ...pdf,
  profiles.browserSaveProfile,
  profiles.browserSwitchProfile,
  profiles.browserListProfiles,
  profiles.browserDeleteProfile,
  profiles.browserExportSessionState,
  profiles.browserImportSessionState,
  profiles.browserImportWorkspaceMetadata,
  profiles.browserDiscoverProfiles,
  ...screenshot,
  ...snapshot,
  ...tabs(true),
  ...testing,
  ...wait(true),
  ...aiNative,
  ...autonomous,
  ...scroll(true),
  ...clock(true),
  ...emulation(true),
  ...diagnostics,
  ...storage,
  ...workflowManagement,
];

export const visionTools: Tool<any>[] = [
  ...common(false),
  ...console,
  ...dialogs(false),
  ...evaluate,
  ...files(false),
  ...install,
  ...keyboard(false),
  ...navigate(false),
  ...network,
  ...pdf,
  profiles.browserSaveProfile,
  profiles.browserSwitchProfile,
  profiles.browserListProfiles,
  profiles.browserDeleteProfile,
  profiles.browserExportSessionState,
  profiles.browserImportSessionState,
  profiles.browserImportWorkspaceMetadata,
  profiles.browserDiscoverProfiles,
  ...tabs(false),
  ...testing,
  ...vision,
  ...wait(false),
  ...aiNative,
  ...autonomous,
  ...scroll(false),
  ...clock(false),
  ...emulation(false),
  ...diagnostics,
  ...storage,
  ...workflowManagement,
];

/**
 * Coordinate-based vision tools (`browser_screen_*`).
 *
 * These drive the mouse/keyboard by viewport coordinates instead of accessibility
 * refs, so they carry no dependency on the aria snapshot pipeline and can be served
 * alongside the snapshot tools rather than replacing them.
 */
export const visionOnlyTools: Tool<any>[] = [...vision];

function dedupeByName(tools: Tool<any>[]): Tool<any>[] {
  const byName = new Map<string, Tool<any>>();
  for (const tool of tools) {
    if (!byName.has(tool.schema.name))
      byName.set(tool.schema.name, tool);
  }
  return [...byName.values()];
}

/**
 * The full natively-registered tool surface: every snapshot tool plus the
 * five coordinate-based screen tools (`browser_screen_*`). Tool names across the
 * two families are disjoint (`browser_click` vs `browser_screen_click`), so both
 * remain reachable in a single session without any mode flag.
 * All five screen tools carry capability 'core' and are always available.
 */
export const allTools: Tool<any>[] = dedupeByName([
  ...snapshotTools,
  ...visionOnlyTools,
]);
