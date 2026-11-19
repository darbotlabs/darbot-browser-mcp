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

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function createTab(client: Client, title: string, body: string) {
  return await client.callTool({
    name: 'browser_tab_new',
    arguments: {
      url: `data:text/html,<title>${title}</title><body>${body}</body>`,
    },
  });
}

test.skip(({ mcpMode }) => mcpMode === 'extension', 'Multi-tab scenarios are not supported with --extension');

test('list initial tabs', async ({ client }) => {
  const result = await client.callTool({
    name: 'browser_tab_list',
  });
  // Edge may show edge://force-signin/ or about:blank depending on configuration
  expect(result).toHaveTextContent(/### Open tabs\n- 1: \(current\) \[\] \((about:blank|edge:\/\/[^\)]+)\)/);
});

test('list first tab', async ({ client }) => {
  await createTab(client, 'Tab one', 'Body one');
  const result = await client.callTool({
    name: 'browser_tab_list',
  });
  // Edge may show edge://force-signin/ or about:blank as first tab
  expect(result).toHaveTextContent(/### Open tabs\n- 1: \[\] \((about:blank|edge:\/\/[^\)]+)\)\n- 2: \(current\) \[Tab one\]/);
});

test('create new tab', async ({ client }) => {
  const result1 = await createTab(client, 'Tab one', 'Body one');
  // Edge may show edge://force-signin/ or about:blank as first tab
  expect(result1).toHaveTextContent(/- Ran Playwright code:/);
  expect(result1).toHaveTextContent(/### Open tabs/);
  expect(result1).toHaveTextContent(/- 1: \[\] \((about:blank|edge:\/\/[^\)]+)\)/);
  expect(result1).toHaveTextContent(/- 2: \(current\) \[Tab one\]/);
  expect(result1).toHaveTextContent(/### Current tab/);
  expect(result1).toHaveTextContent(/- Page URL: data:text\/html/);
  expect(result1).toHaveTextContent(/- Page Title: Tab one/);

  const result2 = await createTab(client, 'Tab two', 'Body two');
  expect(result2).toHaveTextContent(/- 1: \[\] \((about:blank|edge:\/\/[^\)]+)\)/);
  expect(result2).toHaveTextContent(/- 2: \[Tab one\]/);
  expect(result2).toHaveTextContent(/- 3: \(current\) \[Tab two\]/);
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
  // Edge may show edge://force-signin/ or about:blank as first tab
  expect(result).toHaveTextContent(/- Ran Playwright code:/);
  expect(result).toHaveTextContent(/### Open tabs/);
  expect(result).toHaveTextContent(/- 1: \[\] \((about:blank|edge:\/\/[^\)]+)\)/);
  expect(result).toHaveTextContent(/- 2: \(current\) \[Tab one\]/);
  expect(result).toHaveTextContent(/- 3: \[Tab two\]/);
  expect(result).toHaveTextContent(/### Current tab/);
  expect(result).toHaveTextContent(/- Page Title: Tab one/);
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
  // Edge may show edge://force-signin/ or about:blank as first tab
  expect(result).toHaveTextContent(/- Ran Playwright code:/);
  expect(result).toHaveTextContent(/### Open tabs/);
  expect(result).toHaveTextContent(/- 1: \[\] \((about:blank|edge:\/\/[^\)]+)\)/);
  expect(result).toHaveTextContent(/- 2: \(current\) \[Tab one\]/);
  expect(result).toHaveTextContent(/### Current tab/);
  expect(result).toHaveTextContent(/- Page Title: Tab one/);
});

test('reuse first tab when navigating', async ({ startClient, cdpServer, server, mcpBrowser, mcpHeadless }) => {
  // Known Playwright limitation: headless Edge fails with "Browser.getWindowForTarget" CDP error
  test.skip(mcpBrowser === 'msedge' && mcpHeadless, 'Headless Edge does not support launchPersistentContext with CDP');
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
