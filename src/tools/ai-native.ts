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
 * AI-native browser automation tools with natural language understanding
 */

import { z } from 'zod';
import { defineTool } from './tool.js';
import { intentParser } from '../ai/intent.js';
import { aiContextManager } from '../ai/context.js';
import { workflowEngine, type WorkflowParameters } from '../ai/workflow.js';
import {
  executeClick,
  executeNavigate,
  executePressKey,
  executeRecovery,
  executeSearch,
  executeSubmitForm,
  executeType,
  executeWaitFor,
  type ActionResult,
} from '../ai/actions.js';

// AI-native intent execution tool
const browserExecuteIntent = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_execute_intent',
    title: 'AI-Native Intent Execution',
    description: 'Execute browser automation using natural language descriptions with intelligent fallback strategies',
    inputSchema: z.object({
      description: z.string().describe('Natural language description of what you want to accomplish'),
      context: z.string().optional().describe('Additional context about the current task or goal'),
      fallback_strategy: z.enum(['auto_detect_elements', 'search_for_targets', 'analyze_page_context', 'use_accessibility_tree']).optional().describe('Strategy to use if primary action fails'),
      auto_recover: z.boolean().optional().default(true).describe('Whether to automatically recover from errors'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const currentTab = context.currentTabOrDie();
    const sessionId = currentTab.page.url() || 'default';

    // Update context with current task
    if (params.context)
      aiContextManager.updateTask(sessionId, params.context);


    // Parse the natural language intent
    const intent = intentParser.parseIntent(params.description);
    const sessionContext = aiContextManager.getContext(sessionId);
    const enhancedIntent = intentParser.enhanceWithContext(intent, sessionContext);

    const code: string[] = [];
    code.push(`// AI-Native Intent: ${params.description}`);
    code.push(`// Parsed Action: ${enhancedIntent.action}`);
    code.push(`// Confidence: ${(enhancedIntent.confidence * 100).toFixed(1)}%`);

    try {
      const actionResult = await dispatchIntent(context, enhancedIntent);
      if (!actionResult.success)
        throw new Error(actionResult.error || `Action '${enhancedIntent.action}' failed`);

      const successTarget = enhancedIntent.parameters.element
        || enhancedIntent.parameters.url
        || actionResult.detail;
      aiContextManager.recordSuccess(sessionId, {
        action: enhancedIntent.action,
        ...(successTarget !== undefined && { target: String(successTarget) }),
        timestamp: Date.now(),
        success: true,
      });

      code.push(`// Action completed: ${actionResult.detail || enhancedIntent.action}`);

      return {
        code,
        captureSnapshot: true,
        waitForNetwork: true,
        resultOverride: {
          content: [{
            type: 'text',
            text: `Successfully executed: ${params.description}\nAction: ${enhancedIntent.action}\nDetail: ${actionResult.detail || 'ok'}\nConfidence: ${(enhancedIntent.confidence * 100).toFixed(1)}%`,
          }],
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      aiContextManager.recordError(sessionId, {
        errorType: enhancedIntent.action,
        elementSelector: enhancedIntent.parameters.element,
        pageUrl: currentTab.page.url(),
        frequency: 1,
        lastOccurrence: Date.now(),
        recoveryActions: [enhancedIntent.fallbackStrategy || 'auto_detect_elements'],
      });

      if (params.auto_recover) {
        const recovery = await executeRecovery(context, enhancedIntent);
        if (recovery.success) {
          code.push(`// Primary action failed, recovery successful`);
          aiContextManager.recordSuccess(sessionId, {
            action: `recovery:${enhancedIntent.action}`,
            ...(recovery.detail !== undefined && { target: recovery.detail }),
            timestamp: Date.now(),
            success: true,
          });
          return {
            code,
            captureSnapshot: true,
            waitForNetwork: true,
            resultOverride: {
              content: [{
                type: 'text',
                text: `Recovered from error and completed: ${params.description}\nRecovery: ${recovery.detail || enhancedIntent.fallbackStrategy || 'auto'}`,
              }],
            },
          };
        }
        code.push(`// Both primary action and recovery failed`);
      }

      throw new Error(`Failed to execute intent: ${errorMessage}`);
    }
  },
});

// Workflow execution tool
const browserExecuteWorkflow = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_execute_workflow',
    title: 'AI-Native Workflow Execution',
    description: 'Execute predefined workflows for common automation patterns like GitHub issue management',
    inputSchema: z.object({
      intent: z.string().describe('The workflow type (e.g., "github_issue_management", "code_review_workflow")'),
      parameters: z.record(z.string(), z.any()).describe('Parameters for the workflow execution'),
      auto_recover: z.boolean().optional().default(true).describe('Whether to automatically recover from step failures'),
      validate_completion: z.boolean().optional().default(true).describe('Whether to validate successful completion'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    try {
      // Execute the workflow
      const execution = await workflowEngine.executeWorkflow(context, params.intent, params.parameters as WorkflowParameters);

      const code: string[] = [];
      code.push(`// Workflow Execution: ${params.intent}`);
      code.push(`// Status: ${execution.status}`);
      code.push(`// Steps completed: ${execution.currentStep + 1}/${execution.results.length}`);

      if (execution.status === 'completed') {
        return {
          code,
          captureSnapshot: true,
          waitForNetwork: true,
          resultOverride: {
            content: [{
              type: 'text',
              text: `Workflow "${params.intent}" completed successfully\nSteps: ${execution.results.length}\nDuration: ${((Date.now() - execution.startTime) / 1000).toFixed(1)}s`,
            }],
          },
        };
      } else {
        throw new Error(`Workflow failed: ${execution.errors.join(', ')}`);
      }
    } catch (error) {
      throw new Error(`Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Context analysis tool
const browserAnalyzeContext = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_analyze_context',
    title: 'AI-Native Context Analysis',
    description: 'Analyze current page context and suggest intelligent next actions based on user patterns',
    inputSchema: z.object({
      include_suggestions: z.boolean().optional().default(true).describe('Whether to include action suggestions'),
      analyze_patterns: z.boolean().optional().default(true).describe('Whether to analyze user behavior patterns'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const currentTab = context.currentTabOrDie();
    const sessionId = currentTab.page.url() || 'default';
    const currentUrl = currentTab.page.url() || '';
    const pageTitle = await currentTab.page.title() || '';

    // Get current context
    const sessionContext = aiContextManager.getContext(sessionId);

    // Analyze page for intent
    const pageIntent = analyzePageIntent(currentUrl, pageTitle);
    aiContextManager.setPageIntent(sessionId, pageIntent);

    // Get action suggestions if requested
    let suggestions: string[] = [];
    if (params.include_suggestions) {
      suggestions = aiContextManager.suggestNextActions(sessionId, currentUrl);

      // Add workflow suggestions
      const workflowSuggestions = workflowEngine.suggestWorkflows(currentUrl, pageTitle);
      suggestions.push(...workflowSuggestions.map(w => `Execute workflow: ${w.name} - ${w.description}`));
    }

    const analysis = {
      currentPage: {
        url: currentUrl,
        title: pageTitle,
        intent: pageIntent,
      },
      sessionContext: {
        currentTask: sessionContext.currentTask,
        activeGoals: sessionContext.userGoals.filter(g => !g.completed),
        recentActions: sessionContext.successfulActions.slice(-5),
        navigationHistory: sessionContext.navigationHistory.slice(-3),
      },
      suggestions: suggestions.slice(0, 10),
      patterns: params.analyze_patterns ? {
        commonActions: getCommonActionPatterns(sessionContext),
        errorPatterns: sessionContext.failurePatterns.slice(0, 5),
        successRate: calculateSuccessRate(sessionContext),
      } : undefined,
    };

    return {
      code: [`// Context analysis for session: ${sessionId}`],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{
          type: 'text',
          text: `Context Analysis:\n${JSON.stringify(analysis, null, 2)}`,
        }],
      },
    };
  },
});

async function dispatchIntent(context: any, intent: { action: string; parameters: Record<string, any> }): Promise<ActionResult> {
  switch (intent.action) {
    case 'navigate':
      return executeNavigate(context, intent.parameters);
    case 'click':
      return executeClick(context, intent.parameters);
    case 'type':
      return executeType(context, intent.parameters);
    case 'submit_form':
      return executeSubmitForm(context, intent.parameters);
    case 'search':
      return executeSearch(context, intent.parameters);
    case 'wait_for':
      return executeWaitFor(context, intent.parameters);
    case 'press_key':
    case 'press':
      return executePressKey(context, intent.parameters);
    case 'login':
      // Prefer workflow when credentials are supplied; otherwise focus the login form.
      if (intent.parameters.service) {
        return executeNavigate(context, {
          url: intent.parameters.service.startsWith('http')
            ? intent.parameters.service
            : `https://${intent.parameters.service}`,
        });
      }
      return executeClick(context, { element: intent.parameters.element || 'Sign in' });
    case 'github_create_issue':
    case 'github_review_pr':
      return executeGenericIntent(context, intent);
    default:
      return executeGenericIntent(context, intent);
  }
}

async function executeGenericIntent(context: any, intent: { action: string; parameters: Record<string, any> }): Promise<ActionResult> {
  if (intent.parameters.url)
    return executeNavigate(context, intent.parameters);
  if (intent.parameters.element && intent.parameters.text)
    return executeType(context, intent.parameters);
  if (intent.parameters.element)
    return executeClick(context, intent.parameters);
  if (intent.parameters.query)
    return executeSearch(context, intent.parameters);
  if (intent.parameters.description)
    return executeClick(context, { element: String(intent.parameters.description) });
  return {
    success: false,
    action: intent.action,
    error: `No executable parameters for action '${intent.action}'`,
  };
}

function analyzePageIntent(url: string, title: string): string {
  if (url.includes('github.com')) {
    if (url.includes('/issues'))
      return 'github_issues';
    if (url.includes('/pulls'))
      return 'github_pulls';
    if (url.includes('/settings'))
      return 'github_settings';
    return 'github_repository';
  }

  if (title.toLowerCase().includes('login') || title.toLowerCase().includes('sign in'))
    return 'authentication';


  if (url.includes('google.com/search'))
    return 'search_results';

  return 'general_browsing';
}

function getCommonActionPatterns(context: any): Record<string, number> {
  const patterns: Record<string, number> = {};
  context.successfulActions.forEach((action: any) => {
    patterns[action.action] = (patterns[action.action] || 0) + 1;
  });
  return patterns;
}

function calculateSuccessRate(context: any): number {
  const total = context.successfulActions.length + context.failurePatterns.reduce((sum: number, p: any) => sum + p.frequency, 0);
  return total > 0 ? context.successfulActions.length / total : 1;
}

export default [
  browserExecuteIntent,
  browserExecuteWorkflow,
  browserAnalyzeContext,
];
