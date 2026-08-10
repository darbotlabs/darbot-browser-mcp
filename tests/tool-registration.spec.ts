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

import { test, expect } from '@playwright/test';
import { allTools, snapshotTools, visionTools, visionOnlyTools } from '../src/tools.js';

test('2.1.4 registers evaluate and portable session-state tools in both browser modes', () => {
  for (const tools of [snapshotTools, visionTools]) {
    const names = tools.map(tool => tool.schema.name);
    expect(names).toContain('browser_evaluate');
    expect(names).toContain('browser_discover_profiles');
    expect(names).toContain('browser_export_session_state');
    expect(names).toContain('browser_import_session_state');
    expect(names).toContain('browser_import_workspace_metadata');
  }
});

test('allTools exposes the full 68-tool surface with unique names', () => {
  const names = allTools.map(tool => tool.schema.name);
  expect(new Set(names).size).toBe(names.length);
  expect(names.length).toBe(snapshotTools.length + visionOnlyTools.length);
  expect(names.length).toBe(68);
});

test('screen tools are registered natively and carry the core capability', () => {
  const names = allTools.map(tool => tool.schema.name);
  for (const tool of visionOnlyTools) {
    expect(tool.capability).toBe('core');
    expect(names).toContain(tool.schema.name);
  }
});

test('snapshot and vision tool names do not collide', () => {
  const snapshotNames = new Set(snapshotTools.map(tool => tool.schema.name));
  for (const tool of visionOnlyTools)
    expect(snapshotNames.has(tool.schema.name)).toBe(false);
});
