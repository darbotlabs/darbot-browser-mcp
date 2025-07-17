/**
 * Copyright (c) Microsoft Corporation.
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
 * AI-native workflow execution engine for common automation patterns
 */

import type { Context } from '../context.js';

export interface WorkflowStep {
  action: string;
  parameters: Record<string, any>;
  retryCount?: number;
  timeout?: number;
  validation?: (result: any) => boolean;
  onError?: 'continue' | 'retry' | 'abort';
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  steps: WorkflowStep[];
  requiredParameters: string[];
  expectedDuration: number; // in seconds
  successCriteria: string[];
}

export interface WorkflowExecution {
  templateName: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  startTime: number;
  parameters: Record<string, any>;
  results: any[];
  errors: string[];
}

/**
 * Workflow execution engine for automated task sequences
 */
export class WorkflowEngine {
  private templates = new Map<string, WorkflowTemplate>();
  private executions = new Map<string, WorkflowExecution>();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register default workflow templates
   */
  private registerDefaultTemplates(): void {
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
            condition: (params: any) => params.action === 'create',
          },
        },
        {
          action: 'type',
          parameters: {
            element: 'issue title input',
            text: '{title}',
          },
        },
        {
          action: 'type',
          parameters: {
            element: 'issue description textarea',
            text: '{description}',
          },
        },
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
        {
          action: 'navigate',
          parameters: { url: 'https://github.com/{repository}/pulls' },
        },
        {
          action: 'click',
          parameters: { element: 'first pull request in list' },
        },
        {
          action: 'wait_for',
          parameters: { target: 'Files changed tab' },
        },
        {
          action: 'click',
          parameters: { element: 'Files changed tab' },
        },
        {
          action: 'analyze_changes',
          parameters: { focus: 'security and performance' },
        },
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
        {
          action: 'detect_login_form',
          parameters: {},
        },
        {
          action: 'type',
          parameters: {
            element: 'username input',
            text: '{username}',
          },
        },
        {
          action: 'type',
          parameters: {
            element: 'password input',
            text: '{password}',
          },
        },
        {
          action: 'click',
          parameters: { element: 'login button' },
        },
        {
          action: 'wait_for',
          parameters: { target: 'dashboard or home page' },
          timeout: 15000,
        },
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
        {
          action: 'navigate',
          parameters: { url: 'https://github.com/{repository}' },
        },
        {
          action: 'analyze_readme',
          parameters: {},
        },
        {
          action: 'click',
          parameters: { element: 'Issues tab' },
        },
        {
          action: 'analyze_issues',
          parameters: {},
        },
        {
          action: 'click',
          parameters: { element: 'Pull requests tab' },
        },
        {
          action: 'analyze_pull_requests',
          parameters: {},
        },
        {
          action: 'generate_report',
          parameters: { format: 'summary' },
        },
      ],
    });
  }

  /**
   * Register a new workflow template
   */
  registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get available workflow templates
   */
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Execute a workflow by name
   */
  async executeWorkflow(
    context: Context,
    templateName: string,
    parameters: Record<string, any>
  ): Promise<WorkflowExecution> {
    const template = this.templates.get(templateName);
    if (!template)
      throw new Error(`Workflow template '${templateName}' not found`);


    // Validate required parameters
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

    this.executions.set(executionId, execution);

    try {
      for (let i = 0; i < template.steps.length; i++) {
        execution.currentStep = i;
        const step = template.steps[i];

        // Replace parameter placeholders
        const resolvedStep = this.resolveStepParameters(step, parameters);

        try {
          const result = await this.executeStep(context, resolvedStep);
          execution.results.push(result);

          // Validate step result if validation function provided
          if (step.validation && !step.validation(result))
            throw new Error(`Step validation failed for step ${i}`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          execution.errors.push(`Step ${i}: ${errorMessage}`);

          // Handle error based on step configuration
          const onError = step.onError || 'abort';
          if (onError === 'abort') {
            execution.status = 'failed';
            return execution;
          } else if (onError === 'retry' && (step.retryCount || 0) > 0) {
            // Implement retry logic
            for (let retry = 0; retry < (step.retryCount || 0); retry++) {
              try {
                const retryResult = await this.executeStep(context, resolvedStep);
                execution.results.push(retryResult);
                break;
              } catch (retryError) {
                if (retry === (step.retryCount || 0) - 1)
                  throw retryError;

              }
            }
          }
          // Continue to next step if onError is 'continue'
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
   * Resolve parameter placeholders in step
   */
  private resolveStepParameters(step: WorkflowStep, parameters: Record<string, any>): WorkflowStep {
    const resolved = { ...step };
    resolved.parameters = { ...step.parameters };

    // Replace {parameter} placeholders
    for (const [key, value] of Object.entries(resolved.parameters)) {
      if (typeof value === 'string') {
        resolved.parameters[key] = value.replace(/\{(\w+)\}/g, (match, paramName) => {
          return parameters[paramName] || match;
        });
      }
    }

    return resolved;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(context: Context, step: WorkflowStep): Promise<any> {
    // This would integrate with the existing tool system
    // For now, return a mock result
    return {
      action: step.action,
      parameters: step.parameters,
      success: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List all active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(
        execution => execution.status === 'running' || execution.status === 'paused'
    );
  }

  /**
   * Cancel a running workflow
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'failed';
      execution.errors.push('Workflow cancelled by user');
      return true;
    }
    return false;
  }

  /**
   * Suggest workflows based on current context
   */
  suggestWorkflows(currentUrl: string, pageContent: string): WorkflowTemplate[] {
    const suggestions: WorkflowTemplate[] = [];

    // GitHub-specific suggestions
    if (currentUrl.includes('github.com')) {
      if (currentUrl.includes('/issues'))
        suggestions.push(this.templates.get('github_issue_management')!);

      if (currentUrl.includes('/pulls'))
        suggestions.push(this.templates.get('code_review_workflow')!);

      suggestions.push(this.templates.get('repository_analysis')!);
    }

    // Login form detection
    if (pageContent.includes('password') && pageContent.includes('login'))
      suggestions.push(this.templates.get('login_workflow')!);


    return suggestions.filter(Boolean);
  }
}

// Global workflow engine instance
export const workflowEngine = new WorkflowEngine();
