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

test.describe('browser_evaluate', () => {
  test('it should execute a script in the page and return the value', async ({ client, server }) => {
    server.setContent('/', '<title>Evaluate</title><main id="answer">42</main>', 'text/html');
    await client.callTool({ name: 'browser_navigate', arguments: { url: server.PREFIX } });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: { expression: '({ title: document.title, answer: document.querySelector("#answer")?.textContent })' },
    });

    expect(result).toContainTextContent('"title": "Evaluate"');
    expect(result).toContainTextContent('"answer": "42"');
  });

  test('it should report syntax errors without crashing the server', async ({ client, server }) => {
    server.setContent('/', '<title>Syntax error</title>', 'text/html');
    await client.callTool({ name: 'browser_navigate', arguments: { url: server.PREFIX } });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: { expression: '(() => {' },
    });

    expect(result).toContainTextContent('Error evaluating expression:');
  });

  test('it should report runtime errors without crashing the server', async ({ client, server }) => {
    server.setContent('/', '<title>Runtime error</title>', 'text/html');
    await client.callTool({ name: 'browser_navigate', arguments: { url: server.PREFIX } });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: { expression: '(() => { throw new Error("intentional boom"); })()' },
    });

    expect(result).toContainTextContent('intentional boom');
  });

  test('it should handle unserializable return values gracefully', async ({ client, server }) => {
    server.setContent('/', '<title>Unserializable</title>', 'text/html');
    await client.callTool({ name: 'browser_navigate', arguments: { url: server.PREFIX } });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: { expression: '(() => window)()' },
    });

    expect(result).toContainTextContent('Result:');
  });

  test('it should run in the page context and not the server context', async ({ client, server }) => {
    server.setContent('/', '<title>Security boundary</title>', 'text/html');
    await client.callTool({ name: 'browser_navigate', arguments: { url: server.PREFIX } });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        expression: 'typeof window !== "undefined" && typeof process === "undefined" && typeof require === "undefined"',
      },
    });

    expect(result).toContainTextContent('Result: true');
  });

  test('it should return a clear error when no page is ready', async ({ client }) => {
    await client.callTool({ name: 'browser_close' });

    try {
      const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: { expression: '1 + 1' },
      });
      expect(result).toContainTextContent('Error');
    } catch (error) {
      expect(String(error)).toMatch(/page|tab|browser|closed/i);
    }
  });
});
