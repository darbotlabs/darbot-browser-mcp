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

import { test, expect } from '@playwright/test';
import { WorkflowEngine } from '../src/ai/workflow.js';

import type { Context } from '../src/context.js';

test('conditional workflow steps evaluate the workflow parameter map', async () => {
  const invocations: Record<string, unknown>[] = [];
  const clickTool = { schema: { name: 'browser_click' } };
  const context = {
    tools: [clickTool],
    run: async (_tool: unknown, params: Record<string, unknown>) => {
      invocations.push(params);
      return { clicked: true };
    },
  } as unknown as Context;

  const engine = new WorkflowEngine();
  engine.registerTemplate({
    name: 'conditional_test',
    description: 'Test conditional workflow parameters',
    requiredParameters: ['action'],
    expectedDuration: 1,
    successCriteria: ['Conditional click obeyed'],
    steps: [{
      action: 'conditional_click',
      parameters: {
        element: 'New item',
        ref: 'e1',
        condition: params => params.action === 'create',
      },
    }],
  });

  const create = await engine.executeWorkflow(context, 'conditional_test', { action: 'create' });
  expect(create.status).toBe('completed');
  expect(create.results[0]).toMatchObject({ success: true });
  expect(create.results[0]?.skipped).toBeUndefined();
  expect(invocations).toEqual([{ element: 'New item', ref: 'e1' }]);

  const update = await engine.executeWorkflow(context, 'conditional_test', { action: 'update' });
  expect(update.status).toBe('completed');
  expect(update.results[0]).toMatchObject({ success: true, skipped: true });
  expect(invocations).toHaveLength(1);
});
