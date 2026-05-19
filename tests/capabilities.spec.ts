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

import { test, expect } from './fixtures.js';
import { snapshotTools, visionTools } from '../src/tools.js';

function toolNames(tools: typeof snapshotTools): string[] {
  return [...new Set(tools.map(tool => tool.schema.name))].sort();
}

const expectedSnapshotTools = toolNames(snapshotTools);
const expectedVisionTools = toolNames(visionTools);

test.describe('capabilities', () => {
  test('it should expose the registered snapshot tool list', async ({ client }) => {
    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual(expectedSnapshotTools);
    expect(expectedSnapshotTools).toContain('browser_evaluate');
    expect(expectedSnapshotTools).toContain('browser_discover_profiles');
  });

  test('it should expose the registered vision tool list', async ({ visionClient }) => {
    const { tools } = await visionClient.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual(expectedVisionTools);
    expect(expectedVisionTools).toContain('browser_evaluate');
    expect(expectedVisionTools).toContain('browser_discover_profiles');
  });

  test('it should hide non-core tools when core capabilities are requested', async ({ startClient }) => {
    const { client } = await startClient({
      args: ['--caps="core"'],
    });

    const { tools } = await client.listTools();
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('browser_evaluate');
    expect(toolNames).toContain('browser_discover_profiles');
    expect(toolNames).not.toContain('browser_file_upload');
    expect(toolNames).not.toContain('browser_pdf_save');
    expect(toolNames).not.toContain('browser_screen_capture');
    expect(toolNames).not.toContain('browser_screen_click');
    expect(toolNames).not.toContain('browser_screen_drag');
    expect(toolNames).not.toContain('browser_screen_move_mouse');
    expect(toolNames).not.toContain('browser_screen_type');
  });
});
