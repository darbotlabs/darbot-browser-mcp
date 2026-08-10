/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { WorkflowEngine } from '../src/ai/workflow.js';
import workflowManagementTools from '../src/tools/workflow-management.js';

import type { Context } from '../src/context.js';

const workflowEngine = new WorkflowEngine();
const context = { workflowEngine: () => workflowEngine } as Context;

function tool(name: string) {
  const found = workflowManagementTools.find(candidate => candidate.schema.name === name);
  if (!found)
    throw new Error(`Missing tool: ${name}`);
  return found;
}

test('workflow management tools expose registered templates', async () => {
  const result = await tool('browser_workflow_list').handle(context, {});
  const text = (result.resultOverride!.content[0] as { text: string }).text;
  expect(text).toContain('github_issue_management');
  expect(text).toContain('repository_analysis');
});

test('workflow registration adds a serializable template', async () => {
  await tool('browser_workflow_register').handle(context, {
    name: 'registration_test',
    description: 'Test workflow registration',
    requiredParameters: [],
    expectedDuration: 1,
    successCriteria: ['registered'],
    steps: [{ action: 'screenshot', parameters: {} }],
  });
  const result = await tool('browser_workflow_list').handle(context, {});
  const text = (result.resultOverride!.content[0] as { text: string }).text;
  expect(text).toContain('registration_test');
});

test('workflow cancellation reports an unknown execution', async () => {
  const result = await tool('browser_workflow_cancel').handle(context, { execution_id: 'missing_execution' });
  const text = (result.resultOverride!.content[0] as { text: string }).text;
  expect(text).toContain('was not found');
});

test('workflow cancellation remains terminal and skips later steps', async () => {
  const engine = new WorkflowEngine();
  engine.registerTemplate({
    name: 'cancellation_test',
    description: 'Cancellation test',
    requiredParameters: [],
    expectedDuration: 1,
    successCriteria: [],
    steps: [
      { action: 'slow', parameters: {} },
      { action: 'slow', parameters: {} },
    ],
  });
  let calls = 0;
  const executionContext = {
    tools: [{ schema: { name: 'browser_slow' } }],
    run: async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 25));
      return { content: [] };
    },
  } as unknown as Context;

  const executionPromise = engine.executeWorkflow(executionContext, 'cancellation_test', {});
  const executionId = engine.getActiveExecutions()[0]?.id;
  expect(executionId).toBeTruthy();
  expect(engine.cancelExecution(executionId!)).toBe(true);

  const execution = await executionPromise;
  expect(execution.status).toBe('cancelled');
  expect(calls).toBe(1);
});

test('memory tools list and clear an isolated directory', async () => {
  const storageName = `test-${crypto.randomUUID()}`;
  const memoryRoot = path.resolve(process.env.DARBOT_MEMORY_DIR || path.join(process.cwd(), '.darbot', 'memory'));
  const storagePath = path.join(memoryRoot, storageName);
  try {
    await fs.promises.mkdir(storagePath, { recursive: true });
    await fs.promises.writeFile(path.join(storagePath, 'notes.json'), '{"keep":true}');
    await fs.promises.writeFile(path.join(storagePath, 'aaaaaaaaaaaaaaaa.json'), JSON.stringify({
      url: 'https://example.com',
      title: 'Example',
      stateHash: 'aaaaaaaaaaaaaaaa',
      timestamp: Date.now(),
      links: [],
      visited: true,
    }));

    const listResult = await tool('browser_memory_list').handle(context, { storage_path: storageName });
    expect((listResult.resultOverride!.content[0] as { text: string }).text).toContain('https://example.com');

    const clearResult = await tool('browser_memory_clear').handle(context, { storage_path: storageName });
    expect((clearResult.resultOverride!.content[0] as { text: string }).text).toContain('Crawl memory cleared');
    await expect(fs.promises.access(path.join(storagePath, 'aaaaaaaaaaaaaaaa.json'))).rejects.toThrow();
    await expect(fs.promises.readFile(path.join(storagePath, 'notes.json'), 'utf8')).resolves.toBe('{"keep":true}');
  } finally {
    await fs.promises.rm(storagePath, { recursive: true, force: true });
  }
});

test('memory tools reject paths outside the configured root', async () => {
  await expect(tool('browser_memory_clear').handle(context, { storage_path: '..' }))
      .rejects.toThrow('must stay inside');
});
