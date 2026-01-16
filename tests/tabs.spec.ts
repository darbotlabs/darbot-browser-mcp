/**
 * Copyright (c) Microsoft Corporation.
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

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function createTab(client: Client, title: string, body: string) {
  return await client.callTool({
    name: 'browser_tab_new',
    arguments: {
      url: `data:text/html,<title>${title}</title><body>${body}</body>`,
    },
  });
}

// Helper to match initial tab URL (about:blank or edge://force-signin/ depending on Edge version)
const INITIAL_TAB_URL_PATTERN = /(about:blank|edge:\/\/force-signin\/)/;

test.skip(({ mcpMode }) => mcpMode === 'extension', 'Multi-tab scenarios are not supported with --extension');

test('list initial tabs', async ({ client }) => {
  const result = await client.callTool({
    name: 'browser_tab_list',
  });
  const text = (result.content as any)[0].text;
  expect(text).toContain('### Open tabs');
  expect(text).toContain('- 1: (current) []');
  expect(text).toMatch(INITIAL_TAB_URL_PATTERN);
});

test('list first tab', async ({ client }) => {
  await createTab(client, 'Tab one', 'Body one');
  const result = await client.callTool({
    name: 'browser_tab_list',
  });
  const text = (result.content as any)[0].text;
  expect(text).toContain('### Open tabs');
  expect(text).toContain('- 1: []');
  expect(text).toMatch(INITIAL_TAB_URL_PATTERN);
  expect(text).toContain('- 2: (current) [Tab one] (data:text/html,<title>Tab one</title><body>Body one</body>)');
});

test('create new tab', async ({ client }) => {
  const result1 = await createTab(client, 'Tab one', 'Body one');
  const text1 = (result1.content as any)[0].text;
  expect(text1).toContain('// <internal code to open a new tab>');
  expect(text1).toContain('### Open tabs');
  expect(text1).toContain('- 1: []');
  expect(text1).toMatch(INITIAL_TAB_URL_PATTERN);
  expect(text1).toContain('- 2: (current) [Tab one]');
  expect(text1).toContain('### Current tab');
  expect(text1).toContain('- Page Title: Tab one');
  expect(text1).toContain('Body one');

  const result2 = await createTab(client, 'Tab two', 'Body two');
  const text2 = (result2.content as any)[0].text;
  expect(text2).toContain('### Open tabs');
  expect(text2).toContain('- 1: []');
  expect(text2).toMatch(INITIAL_TAB_URL_PATTERN);
  expect(text2).toContain('- 2: [Tab one]');
  expect(text2).toContain('- 3: (current) [Tab two]');
  expect(text2).toContain('- Page Title: Tab two');
  expect(text2).toContain('Body two');
});

test('select tab', async ({ client }) => {
  await createTab(client, 'Tab one', 'Body one');
  await createTab(client, 'Tab two', 'Body two');
  const result = await client.callTool({
    name: 'browser_tab_select',
    arguments: {
      index: 2,
    },
  });
  const text = (result.content as any)[0].text;
  expect(text).toContain('// <internal code to select tab 2>');
  expect(text).toContain('### Open tabs');
  expect(text).toContain('- 1: []');
  expect(text).toMatch(INITIAL_TAB_URL_PATTERN);
  expect(text).toContain('- 2: (current) [Tab one]');
  expect(text).toContain('- 3: [Tab two]');
  expect(text).toContain('- Page Title: Tab one');
});

test('close tab', async ({ client }) => {
  await createTab(client, 'Tab one', 'Body one');
  await createTab(client, 'Tab two', 'Body two');
  const result = await client.callTool({
    name: 'browser_tab_close',
    arguments: {
      index: 3,
    },
  });
  const text = (result.content as any)[0].text;
  expect(text).toContain('// <internal code to close tab 3>');
  expect(text).toContain('### Open tabs');
  expect(text).toContain('- 1: []');
  expect(text).toMatch(INITIAL_TAB_URL_PATTERN);
  expect(text).toContain('- 2: (current) [Tab one]');
  expect(text).not.toContain('Tab two');
  expect(text).toContain('- Page Title: Tab one');
});

test('reuse first tab when navigating', async ({ startClient, cdpServer, server }) => {
  test.skip(process.platform === 'win32', 'CDP test has sandbox issues on Windows');
  const browserContext = await cdpServer.start();
  const pages = browserContext.pages();

  const { client } = await startClient({ args: [`--cdp-endpoint=${cdpServer.endpoint}`] });
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  expect(pages.length).toBe(1);
  expect(await pages[0].title()).toBe('Title');
});
