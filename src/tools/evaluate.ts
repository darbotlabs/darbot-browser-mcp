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

const evaluateTool = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_evaluate',
    title: 'Execute JavaScript',
    description: 'Execute JavaScript code in the browser page context and return the result. Useful for reading DOM state, querying values, or running custom scripts.',
    inputSchema: z.object({
      expression: z.string().describe('JavaScript expression or function body to evaluate in the page context'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Evaluate JavaScript in page context`,
      `const result = await page.evaluate(/* expression */);`,
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
