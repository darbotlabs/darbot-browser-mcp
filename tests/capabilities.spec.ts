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

test('test snapshot tool list', async ({ client }) => {
  const { tools } = await client.listTools();
  expect(new Set(tools.map(t => t.name))).toEqual(new Set([
    'browser_analyze_context',
    'browser_clear_cookies',
    'browser_click',
    'browser_clock_fast_forward',
    'browser_clock_install',
    'browser_clock_pause',
    'browser_clock_resume',
    'browser_clock_set_fixed_time',
    'browser_close',
    'browser_configure_memory',
    'browser_console_filtered',
    'browser_console_messages',
    'browser_delete_profile',
    'browser_drag',
    'browser_emulate_geolocation',
    'browser_emulate_media',
    'browser_emulate_timezone',
    'browser_execute_intent',
    'browser_execute_workflow',
    'browser_file_upload',
    'browser_generate_playwright_test',
    'browser_get_cookies',
    'browser_get_local_storage',
    'browser_handle_dialog',
    'browser_hover',
    'browser_install',
    'browser_list_profiles',
    'browser_navigate',
    'browser_navigate_back',
    'browser_navigate_forward',
    'browser_network_requests',
    'browser_pdf_save',
    'browser_performance_metrics',
    'browser_press_key',
    'browser_resize',
    'browser_save_profile',
    'browser_save_storage_state',
    'browser_scroll',
    'browser_scroll_to_element',
    'browser_select_option',
    'browser_set_cookie',
    'browser_set_local_storage',
    'browser_snapshot',
    'browser_start_autonomous_crawl',
    'browser_switch_profile',
    'browser_tab_close',
    'browser_tab_list',
    'browser_tab_new',
    'browser_tab_select',
    'browser_take_screenshot',
    'browser_type',
    'browser_wait_for',
  ]));
});

test('test vision tool list', async ({ visionClient }) => {
  const { tools: visionTools } = await visionClient.listTools();
  expect(new Set(visionTools.map(t => t.name))).toEqual(new Set([
    'browser_analyze_context',
    'browser_clear_cookies',
    'browser_clock_fast_forward',
    'browser_clock_install',
    'browser_clock_pause',
    'browser_clock_resume',
    'browser_clock_set_fixed_time',
    'browser_close',
    'browser_configure_memory',
    'browser_console_filtered',
    'browser_console_messages',
    'browser_delete_profile',
    'browser_emulate_geolocation',
    'browser_emulate_media',
    'browser_emulate_timezone',
    'browser_execute_intent',
    'browser_execute_workflow',
    'browser_file_upload',
    'browser_generate_playwright_test',
    'browser_get_cookies',
    'browser_get_local_storage',
    'browser_handle_dialog',
    'browser_install',
    'browser_list_profiles',
    'browser_navigate',
    'browser_navigate_back',
    'browser_navigate_forward',
    'browser_network_requests',
    'browser_pdf_save',
    'browser_performance_metrics',
    'browser_press_key',
    'browser_resize',
    'browser_save_profile',
    'browser_save_storage_state',
    'browser_screen_capture',
    'browser_screen_click',
    'browser_screen_drag',
    'browser_screen_move_mouse',
    'browser_screen_type',
    'browser_scroll',
    'browser_scroll_to_element',
    'browser_set_cookie',
    'browser_set_local_storage',
    'browser_start_autonomous_crawl',
    'browser_switch_profile',
    'browser_tab_close',
    'browser_tab_list',
    'browser_tab_new',
    'browser_tab_select',
    'browser_wait_for',
  ]));
});

test('test capabilities', async ({ startClient }) => {
  const { client } = await startClient({
    args: ['--caps="core"'],
  });
  const { tools } = await client.listTools();
  const toolNames = tools.map(t => t.name);
  expect(toolNames).not.toContain('browser_file_upload');
  expect(toolNames).not.toContain('browser_pdf_save');
  expect(toolNames).not.toContain('browser_screen_capture');
  expect(toolNames).not.toContain('browser_screen_click');
  expect(toolNames).not.toContain('browser_screen_drag');
  expect(toolNames).not.toContain('browser_screen_move_mouse');
  expect(toolNames).not.toContain('browser_screen_type');
});
