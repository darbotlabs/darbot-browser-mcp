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
import { allTools, visionOnlyTools } from '../src/tools.js';

function toolNames(tools: typeof allTools): string[] {
  return [...new Set(tools.map(tool => tool.schema.name))].sort();
}

const expectedTools = toolNames(allTools);
const expectedVisionOnlyTools = toolNames(visionOnlyTools);

test.describe('capabilities', () => {
  test('it should expose the full tool list including vision tools', async ({ client }) => {
    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual(expectedTools);
    expect(expectedTools).toContain('browser_evaluate');
    expect(expectedTools).toContain('browser_discover_profiles');
    expect(expectedTools).toContain('browser_export_session_state');
    expect(expectedTools).toContain('browser_import_session_state');
    expect(expectedTools).toContain('browser_import_workspace_metadata');
    for (const name of expectedVisionOnlyTools)
      expect(tools.map(tool => tool.name)).toContain(name);
  });

  test('coordinate-based screen tools are reachable in the unified registry', async ({ client }) => {
    const { tools } = await client.listTools();
    const names = tools.map(tool => tool.name);

    expect(names).toContain('browser_screen_capture');
    expect(names).toContain('browser_screen_click');
    expect(names).toContain('browser_screen_drag');
    expect(names).toContain('browser_screen_move_mouse');
    expect(names).toContain('browser_screen_type');
    // Snapshot-based counterparts stay available in the same session.
    expect(names).toContain('browser_snapshot');
    expect(names).toContain('browser_click');
  });

  test('the native screen tool client includes the complete tool surface', async ({ visionClient }) => {
    const { tools } = await visionClient.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual(expectedTools);
  });

  test('it should hide non-core tools when core capabilities are requested', async ({ startClient }) => {
    const { client } = await startClient({
      args: ['--caps="core"'],
    });

    const { tools } = await client.listTools();
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('browser_evaluate');
    expect(toolNames).toContain('browser_discover_profiles');
    expect(toolNames).toContain('browser_export_session_state');
    expect(toolNames).toContain('browser_import_session_state');
    expect(toolNames).toContain('browser_import_workspace_metadata');
    expect(toolNames).not.toContain('browser_file_upload');
    expect(toolNames).not.toContain('browser_pdf_save');
    expect(toolNames).toContain('browser_screen_capture');
    expect(toolNames).toContain('browser_screen_click');
    expect(toolNames).toContain('browser_screen_drag');
    expect(toolNames).toContain('browser_screen_move_mouse');
    expect(toolNames).toContain('browser_screen_type');
  });
});
