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

/**
 * Public AI surface for darbot-browser-mcp.
 *
 * Live modules under `src/ai/`:
 * - intent — natural-language command parsing
 * - context — session task / success / failure memory
 * - workflow — multi-step tool orchestration
 * - actions — real browser side-effects used by intent + workflow
 *
 * Autonomous crawl planning lives in `src/planner.ts` and is driven by
 * `src/orchestrator.ts` (not duplicated under `ai/`).
 */

export { intentParser, IntentParser } from './intent.js';
export type { ParsedIntent, IntentPattern } from './intent.js';
export { aiContextManager, AIContextManager } from './context.js';
export type {
  SessionContext,
  ActionHistory,
  ErrorPattern,
  PageState,
  UserGoal,
} from './context.js';
export { workflowEngine, WorkflowEngine } from './workflow.js';
export type {
  WorkflowParameters,
  WorkflowExecution,
  WorkflowTemplate,
  WorkflowStep,
  WorkflowStepResult,
} from './workflow.js';
export * from './actions.js';
