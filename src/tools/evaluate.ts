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

import { z } from 'zod';
import { defineTool } from './tool.js';

const evaluateSchema = z.object({
  expression: z
      .string()
      .min(1)
      .describe('JavaScript expression (or async function body) evaluated in the page context via `page.evaluate`. Has access to `window`, `document`, and other DOM globals — but no Node.js APIs.'),
});

/**
 * Execute arbitrary JavaScript in the active page's main-world context and
 * return the serialized result. Errors are caught and returned as text so a
 * malformed expression doesn't tear down the MCP session.
 *
 * @example
 * await browser_evaluate({ expression: 'document.title' });
 *
 * @example
 * await browser_evaluate({ expression: 'Array.from(document.querySelectorAll("h1")).map(h => h.textContent)' });
 */
const evaluateTool = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_evaluate',
    title: 'Execute JavaScript',
    description: 'Execute JavaScript code in the active page context and return the JSON-serialized result. Useful for reading DOM state, querying values, or running custom scripts. Marked destructive because the expression can mutate page state.',
    inputSchema: evaluateSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Evaluate JavaScript in page context`,
      `const result = await page.evaluate(${JSON.stringify(params.expression)});`,
    ];

    const action = async () => {
      let result: unknown;
      try {
        result = await tab.page.evaluate(params.expression);
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error evaluating expression: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }

      let text: string;
      if (result === undefined) {
        text = 'Result: undefined';
      } else if (result === null) {
        text = 'Result: null';
      } else if (typeof result === 'object') {
        try {
          text = `Result: ${JSON.stringify(result, null, 2)}`;
        } catch {
          // Circular reference or non-serializable value — fall back to String().
          text = `Result: ${String(result)}`;
        }
      } else {
        text = `Result: ${String(result)}`;
      }

      return {
        content: [{ type: 'text' as const, text }],
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

export default [evaluateTool];
