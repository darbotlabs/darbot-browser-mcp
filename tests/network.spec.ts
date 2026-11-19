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

test('browser_network_requests', async ({ client, server }) => {
  server.setContent('/', `
    <button onclick="fetch('/json')">Click me</button>
  `, 'text/html');

  server.setContent('/json', JSON.stringify({ name: 'John Doe' }), 'application/json');

  await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url: server.PREFIX,
    },
  });

  await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Click me button',
      ref: 'e2',
    },
  });

  // Wait for the network request to complete and verify both requests are captured
  // Note: Edge may include internal edge:// requests in the output
  await expect.poll(async () => {
    const result = await client.callTool({
      name: 'browser_network_requests',
    });
    const text = (result.content as any)[0]?.text || '';
    return text.includes(`[GET] ${server.PREFIX} => [200] OK`) && 
           text.includes(`[GET] ${server.PREFIX}json => [200] OK`);
  }, { timeout: 10000 }).toBe(true);
});
