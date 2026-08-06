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

test('AI intent execution performs real click and type side effects', async ({ client, server }) => {
  server.setContent('/', `
    <label>Search box <input aria-label="Search box"></label>
    <button onclick="document.body.dataset.clicked = 'yes'">Submit</button>
  `, 'text/html');
  await client.callTool({ name: 'browser_navigate', arguments: { url: server.PREFIX } });

  const typed = await client.callTool({
    name: 'browser_execute_intent',
    arguments: {
      description: 'type "hello world" into the search box',
      auto_recover: false,
    },
  });
  expect(typed).toContainTextContent('Successfully executed');

  const clicked = await client.callTool({
    name: 'browser_execute_intent',
    arguments: {
      description: 'click the submit button',
      auto_recover: false,
    },
  });
  expect(clicked).toContainTextContent('Successfully executed');

  const state = await client.callTool({
    name: 'browser_evaluate',
    arguments: {
      expression: '({ value: document.querySelector("input")?.value, clicked: document.body.dataset.clicked })',
    },
  });
  expect(state).toContainTextContent('"value": "hello world"');
  expect(state).toContainTextContent('"clicked": "yes"');
});
