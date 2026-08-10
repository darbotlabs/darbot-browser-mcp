/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';
import type { WorkflowParamValue } from '../ai/workflow.js';
import { LocalMemoryStorage } from '../memory.js';
import { defineTool } from './tool.js';

const browserWorkflowList = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_workflow_list',
    title: 'List workflow templates',
    description: 'List all workflow templates available to browser_execute_workflow.',
    inputSchema: z.object({}),
    type: 'readOnly',
  },
  handle: async context => {
    const templates = context.workflowEngine().getTemplates();
    const text = templates.length === 0
      ? 'No workflow templates registered.'
      : templates.map(template => [
        `**${template.name}**`,
        `Description: ${template.description}`,
        `Required parameters: ${template.requiredParameters.join(', ') || '(none)'}`,
        `Expected duration: ${template.expectedDuration}s`,
        `Success criteria: ${template.successCriteria.join('; ') || '(none)'}`,
        `Steps: ${template.steps.length}`,
      ].join('\n')).join('\n\n');
    return {
      code: ['// List registered workflow templates'],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: { content: [{ type: 'text' as const, text }] },
    };
  },
});

const browserWorkflowActive = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_workflow_active',
    title: 'List active workflow executions',
    description: 'List running or paused workflow executions and their cancellation IDs.',
    inputSchema: z.object({}),
    type: 'readOnly',
  },
  handle: async context => {
    const executions = context.workflowEngine().getActiveExecutions();
    const text = executions.length === 0
      ? 'No active workflow executions.'
      : executions.map(execution => [
        `**${execution.templateName}**`,
        `Execution ID: ${execution.id ?? '(unavailable)'}`,
        `Status: ${execution.status}`,
        `Current step: ${execution.currentStep}`,
        `Started: ${new Date(execution.startTime).toISOString()}`,
      ].join('\n')).join('\n\n');
    return {
      code: ['// List active workflow executions'],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: { content: [{ type: 'text' as const, text }] },
    };
  },
});

const browserWorkflowCancel = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_workflow_cancel',
    title: 'Cancel workflow execution',
    description: 'Cancel a running workflow execution by its execution ID.',
    inputSchema: z.object({
      execution_id: z.string().min(1).describe('Execution ID returned by browser_execute_workflow or browser_workflow_active'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    const cancelled = context.workflowEngine().cancelExecution(params.execution_id);
    return {
      code: [`// Cancel workflow execution ${params.execution_id}`],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text' as const,
          text: cancelled
            ? `Workflow execution "${params.execution_id}" cancelled.`
            : `Execution "${params.execution_id}" was not found or is not running.`,
        }],
      },
    };
  },
});

const workflowStepSchema = z.object({
  action: z.string().min(1),
  parameters: z.record(z.string(), z.any()),
  retryCount: z.number().int().nonnegative().optional(),
  timeout: z.number().int().positive().optional(),
  onError: z.enum(['continue', 'retry', 'abort']).optional(),
});

const browserWorkflowRegister = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_workflow_register',
    title: 'Register workflow template',
    description: 'Register or replace a serializable workflow template.',
    inputSchema: z.object({
      name: z.string().min(1),
      description: z.string(),
      steps: z.array(workflowStepSchema).min(1),
      requiredParameters: z.array(z.string()),
      expectedDuration: z.number().int().nonnegative(),
      successCriteria: z.array(z.string()),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    context.workflowEngine().registerTemplate({
      name: params.name,
      description: params.description,
      steps: params.steps.map(step => ({
        action: step.action,
        parameters: step.parameters as Record<string, WorkflowParamValue>,
        ...(step.retryCount !== undefined && { retryCount: step.retryCount }),
        ...(step.timeout !== undefined && { timeout: step.timeout }),
        ...(step.onError !== undefined && { onError: step.onError }),
      })),
      requiredParameters: params.requiredParameters,
      expectedDuration: params.expectedDuration,
      successCriteria: params.successCriteria,
    });
    return {
      code: [`// Register workflow template ${params.name}`],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{ type: 'text' as const, text: `Workflow template "${params.name}" registered with ${params.steps.length} step(s).` }],
      },
    };
  },
});

const memoryInputSchema = z.object({
  storage_path: z.string().optional().describe('Storage directory inside the configured DARBOT_MEMORY_DIR root; defaults to the root itself.'),
});

async function resolveMemoryStoragePath(requestedPath?: string): Promise<string> {
  const root = path.resolve(process.env.DARBOT_MEMORY_DIR || path.join(process.cwd(), '.darbot', 'memory'));
  await fs.promises.mkdir(root, { recursive: true });
  const realRoot = await fs.promises.realpath(root);
  const candidate = requestedPath ? path.resolve(root, requestedPath) : realRoot;
  const relativeCandidate = path.relative(root, candidate);
  if (relativeCandidate.startsWith('..') || path.isAbsolute(relativeCandidate))
    throw new Error(`Crawl memory storage must stay inside ${root}`);

  await fs.promises.mkdir(candidate, { recursive: true });
  const realCandidate = await fs.promises.realpath(candidate);
  const relativeRealPath = path.relative(realRoot, realCandidate);
  if (relativeRealPath.startsWith('..') || path.isAbsolute(relativeRealPath))
    throw new Error(`Crawl memory storage must stay inside ${realRoot}`);
  return realCandidate;
}

const browserMemoryList = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_memory_list',
    title: 'List crawl memory',
    description: 'List states stored by autonomous crawl memory.',
    inputSchema: memoryInputSchema,
    type: 'readOnly',
  },
  handle: async (_context, params) => {
    const storage = new LocalMemoryStorage({ storagePath: await resolveMemoryStoragePath(params.storage_path) });
    const states = await storage.getAllStates();
    const text = states.length === 0
      ? 'No crawl states stored.'
      : states.map(state => [
        `**${state.url}**`,
        `Title: ${state.title || '(none)'}`,
        `State hash: ${state.stateHash}`,
        `Timestamp: ${new Date(state.timestamp).toISOString()}`,
        `Visited: ${state.visited}`,
        `Links: ${state.links.length}`,
      ].join('\n')).join('\n\n');
    return {
      code: ['// List crawl memory states'],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: { content: [{ type: 'text' as const, text }] },
    };
  },
});

const browserMemoryClear = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_memory_clear',
    title: 'Clear crawl memory',
    description: 'Delete all crawl state files from local memory storage.',
    inputSchema: memoryInputSchema,
    type: 'destructive',
  },
  handle: async (_context, params) => {
    const storage = new LocalMemoryStorage({ storagePath: await resolveMemoryStoragePath(params.storage_path) });
    await storage.clear();
    return {
      code: ['// Clear crawl memory states'],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: { content: [{ type: 'text' as const, text: 'Crawl memory cleared.' }] },
    };
  },
});

export default [
  browserWorkflowList,
  browserWorkflowActive,
  browserWorkflowCancel,
  browserWorkflowRegister,
  browserMemoryList,
  browserMemoryClear,
];
