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
 * AI-native workflow execution engine for common automation patterns.
 *
 * A workflow is an ordered list of declarative steps that map onto browser
 * MCP tools (`browser_navigate`, `browser_click`, ...). The engine wraps
 * step execution with parameter interpolation, conditional execution, retry
 * and error policies, and surfaces the structured results back to callers.
 */

import type { Context } from '../context.js';

/** A value that can appear in workflow step parameters. */
export type WorkflowParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | WorkflowParamValue[]
  | { [key: string]: WorkflowParamValue }
  | ((params: WorkflowParameters) => boolean);

export type WorkflowParameters = Record<string, WorkflowParamValue>;

/** Validation callback applied to a step's structured result. */
export type StepValidator = (result: WorkflowStepResult) => boolean;

export interface WorkflowStep {
  action: string;
  parameters: WorkflowParameters;
  retryCount?: number;
  timeout?: number;
  validation?: StepValidator;
  onError?: 'continue' | 'retry' | 'abort';
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  steps: WorkflowStep[];
  requiredParameters: string[];
  /** Expected wall-clock duration in seconds — informational only. */
  expectedDuration: number;
  successCriteria: string[];
}

export interface WorkflowStepResult {
  action: string;
  toolName: string;
  parameters?: Record<string, unknown>;
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  result?: unknown;
  timestamp: number;
  duration: number;
}

export interface WorkflowExecution {
  templateName: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  startTime: number;
  parameters: WorkflowParameters;
  results: WorkflowStepResult[];
  errors: string[];
}

/**
 * Workflow execution engine for automated task sequences.
 */
export class WorkflowEngine {
  private readonly _templates = new Map<string, WorkflowTemplate>();
  private readonly _executions = new Map<string, WorkflowExecution>();

  constructor() {
    this._registerDefaultTemplates();
  }

  /**
   * Map declarative workflow action names onto the concrete MCP tools.
   * Actions not in the map fall back to `browser_<action>`.
   */
  private readonly _actionToToolMap: Record<string, string> = {
    'navigate': 'browser_navigate',
    'click': 'browser_click',
    'conditional_click': 'browser_click',
    'type': 'browser_type',
    'wait_for': 'browser_wait_for',
    'screenshot': 'browser_screenshot',
    'snapshot': 'browser_snapshot',
    'detect_login_form': 'browser_snapshot',
    'analyze_readme': 'browser_snapshot',
    'analyze_issues': 'browser_snapshot',
    'analyze_pull_requests': 'browser_snapshot',
    'analyze_changes': 'browser_snapshot',
    'generate_report': 'browser_snapshot',
  };

  private _registerDefaultTemplates(): void {
    // GitHub Issue Management
    this.registerTemplate({
      name: 'github_issue_management',
      description: 'Create, update, or manage GitHub issues',
      requiredParameters: ['repository', 'action'],
      expectedDuration: 60,
      successCriteria: ['Issue created or updated successfully'],
      steps: [
        {
          action: 'navigate',
          parameters: { url: 'https://github.com/{repository}/issues' },
          retryCount: 2,
          timeout: 10000,
        },
        {
          action: 'conditional_click',
          parameters: {
            element: 'New issue button',
            condition: (params: WorkflowParameters) => params.action === 'create',
          },
        },
        { action: 'type', parameters: { element: 'issue title input', text: '{title}' } },
        { action: 'type', parameters: { element: 'issue description textarea', text: '{description}' } },
        {
          action: 'click',
          parameters: { element: 'Submit new issue' },
          validation: result => result.success,
        },
      ],
    });

    // Code Review Workflow
    this.registerTemplate({
      name: 'code_review_workflow',
      description: 'Navigate and review pull requests',
      requiredParameters: ['repository'],
      expectedDuration: 120,
      successCriteria: ['PR reviewed and commented'],
      steps: [
        { action: 'navigate', parameters: { url: 'https://github.com/{repository}/pulls' } },
        { action: 'click', parameters: { element: 'first pull request in list' } },
        { action: 'wait_for', parameters: { target: 'Files changed tab' } },
        { action: 'click', parameters: { element: 'Files changed tab' } },
        { action: 'analyze_changes', parameters: { focus: 'security and performance' } },
      ],
    });

    // Login Workflow
    this.registerTemplate({
      name: 'login_workflow',
      description: 'Automated login to common services',
      requiredParameters: ['service'],
      expectedDuration: 30,
      successCriteria: ['Successfully logged in'],
      steps: [
        { action: 'detect_login_form', parameters: {} },
        { action: 'type', parameters: { element: 'username input', text: '{username}' } },
        { action: 'type', parameters: { element: 'password input', text: '{password}' } },
        { action: 'click', parameters: { element: 'login button' } },
        { action: 'wait_for', parameters: { target: 'dashboard or home page' }, timeout: 15000 },
      ],
    });

    // Repository Analysis
    this.registerTemplate({
      name: 'repository_analysis',
      description: 'Comprehensive repository health and activity analysis',
      requiredParameters: ['repository'],
      expectedDuration: 90,
      successCriteria: ['Analysis report generated'],
      steps: [
        { action: 'navigate', parameters: { url: 'https://github.com/{repository}' } },
        { action: 'analyze_readme', parameters: {} },
        { action: 'click', parameters: { element: 'Issues tab' } },
        { action: 'analyze_issues', parameters: {} },
        { action: 'click', parameters: { element: 'Pull requests tab' } },
        { action: 'analyze_pull_requests', parameters: {} },
        { action: 'generate_report', parameters: { format: 'summary' } },
      ],
    });
  }

  /** Register a new workflow template, replacing one with the same name. */
  registerTemplate(template: WorkflowTemplate): void {
    this._templates.set(template.name, template);
  }

  /** All registered workflow templates. */
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this._templates.values());
  }

  /**
   * Execute a workflow by name. Required parameters are validated up-front
   * and missing values throw before any tool is invoked.
   */
  async executeWorkflow(
    context: Context,
    templateName: string,
    parameters: WorkflowParameters,
  ): Promise<WorkflowExecution> {
    const template = this._templates.get(templateName);
    if (!template)
      throw new Error(`Workflow template '${templateName}' not found`);

    for (const required of template.requiredParameters) {
      if (!(required in parameters))
        throw new Error(`Missing required parameter: ${required}`);
    }

    const executionId = `${templateName}_${Date.now()}`;
    const execution: WorkflowExecution = {
      templateName,
      status: 'running',
      currentStep: 0,
      startTime: Date.now(),
      parameters,
      results: [],
      errors: [],
    };
    this._executions.set(executionId, execution);

    try {
      for (let i = 0; i < template.steps.length; i++) {
        execution.currentStep = i;
        const step = template.steps[i];
        if (!step)
          continue;
        const resolvedStep = this._resolveStepParameters(step, parameters);

        try {
          const result = await this._executeStep(context, resolvedStep);
          execution.results.push(result);

          if (step.validation && !step.validation(result))
            throw new Error(`Step validation failed for step ${i}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          execution.errors.push(`Step ${i}: ${errorMessage}`);

          const onError = step.onError ?? 'abort';
          if (onError === 'abort') {
            execution.status = 'failed';
            return execution;
          }
          if (onError === 'retry' && (step.retryCount ?? 0) > 0) {
            const retries = step.retryCount ?? 0;
            for (let retry = 0; retry < retries; retry++) {
              try {
                execution.results.push(await this._executeStep(context, resolvedStep));
                break;
              } catch (retryError) {
                if (retry === retries - 1)
                  throw retryError;
              }
            }
          }
          // 'continue' falls through to the next step
        }
      }
      execution.status = 'completed';
    } catch (error) {
      execution.status = 'failed';
      execution.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return execution;
  }

  /**
   * Interpolate `{name}` placeholders in string parameters against the
   * supplied parameter map. Non-string values pass through unchanged.
   */
  private _resolveStepParameters(step: WorkflowStep, parameters: WorkflowParameters): WorkflowStep {
    const resolved: WorkflowStep = { ...step, parameters: { ...step.parameters } };
    for (const [key, value] of Object.entries(resolved.parameters)) {
      if (typeof value === 'string') {
        resolved.parameters[key] = value.replace(/\{(\w+)\}/g, (match, paramName: string) => {
          const replacement = parameters[paramName];
          return typeof replacement === 'string' || typeof replacement === 'number' || typeof replacement === 'boolean'
            ? String(replacement)
            : match;
        });
      }
    }
    return resolved;
  }

  /**
   * Translate a single workflow step into a tool invocation.
   *
   * Returns a structured `WorkflowStepResult` for both success and failure
   * paths; callers should branch on `success`.
   */
  private async _executeStep(context: Context, step: WorkflowStep): Promise<WorkflowStepResult> {
    const startTime = Date.now();
    const toolName = this._actionToToolMap[step.action] ?? `browser_${step.action}`;

    const tool = context.tools.find(t => t.schema.name === toolName);
    if (!tool) {
      return {
        action: step.action,
        toolName,
        success: false,
        error: `Tool '${toolName}' not found for action '${step.action}'`,
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    }

    const toolParams: Record<string, unknown> = {};
    if (typeof step.parameters.url === 'string')
      toolParams.url = step.parameters.url;
    if (typeof step.parameters.element === 'string')
      toolParams.element = step.parameters.element;
    if (typeof step.parameters.text === 'string')
      toolParams.text = step.parameters.text;
    if (typeof step.parameters.target === 'string')
      toolParams.text = step.parameters.target; // wait_for takes its target via the 'text' param

    if (step.action === 'conditional_click' && typeof step.parameters.condition === 'function') {
      const conditionFn = step.parameters.condition;
      if (!conditionFn(step.parameters)) {
        return {
          action: step.action,
          toolName,
          success: true,
          skipped: true,
          reason: 'Condition not met',
          timestamp: startTime,
          duration: Date.now() - startTime,
        };
      }
    }

    try {
      const result = await context.run(tool, toolParams);
      return {
        action: step.action,
        toolName,
        parameters: toolParams,
        success: true,
        result,
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        action: step.action,
        toolName,
        parameters: toolParams,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    }
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this._executions.get(executionId);
  }

  /** All executions in `running` or `paused` state. */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this._executions.values()).filter(
        execution => execution.status === 'running' || execution.status === 'paused'
    );
  }

  /** Cancel a running workflow; returns true if it was cancelled. */
  cancelExecution(executionId: string): boolean {
    const execution = this._executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'failed';
      execution.errors.push('Workflow cancelled by user');
      return true;
    }
    return false;
  }

  /**
   * Suggest workflows based on the current URL and (lowercased) page content.
   */
  suggestWorkflows(currentUrl: string, pageContent: string): WorkflowTemplate[] {
    const suggestions: WorkflowTemplate[] = [];

    if (currentUrl.includes('github.com')) {
      if (currentUrl.includes('/issues'))
        push(suggestions, this._templates.get('github_issue_management'));
      if (currentUrl.includes('/pulls'))
        push(suggestions, this._templates.get('code_review_workflow'));

      push(suggestions, this._templates.get('repository_analysis'));
    }

    if (pageContent.includes('password') && pageContent.includes('login'))
      push(suggestions, this._templates.get('login_workflow'));

    return suggestions;
  }
}

function push<T>(arr: T[], value: T | undefined): void {
  if (value !== undefined)
    arr.push(value);
}

/** Process-wide workflow engine instance. */
export const workflowEngine = new WorkflowEngine();
