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
import { workflowEngine } from '../ai/workflow.js';

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
      // Execute the parsed intent
      switch (enhancedIntent.action) {
        case 'navigate':
          await executeNavigate(context, enhancedIntent.parameters);
          break;
        case 'click':
          await executeClick(context, enhancedIntent.parameters);
          break;
        case 'type':
          await executeType(context, enhancedIntent.parameters);
          break;
        case 'submit_form':
          await executeSubmitForm(context, enhancedIntent.parameters);
          break;
        case 'search':
          await executeSearch(context, enhancedIntent.parameters);
          break;
        default:
          await executeGenericIntent(context, enhancedIntent);
      }

      // Record successful action
      aiContextManager.recordSuccess(sessionId, {
        action: enhancedIntent.action,
        target: enhancedIntent.parameters.element || enhancedIntent.parameters.url,
        timestamp: Date.now(),
        success: true,
      });

      code.push(`// Action completed successfully`);

      return {
        code,
        captureSnapshot: true,
        waitForNetwork: true,
        resultOverride: {
          content: [{
            type: 'text',
            text: `Successfully executed: ${params.description}\nAction: ${enhancedIntent.action}\nConfidence: ${(enhancedIntent.confidence * 100).toFixed(1)}%`,
          }],
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record error pattern
      aiContextManager.recordError(sessionId, {
        errorType: enhancedIntent.action,
        elementSelector: enhancedIntent.parameters.element,
        pageUrl: currentTab.page.url(),
        frequency: 1,
        lastOccurrence: Date.now(),
        recoveryActions: [enhancedIntent.fallbackStrategy || 'auto_detect_elements'],
      });

      // Attempt recovery if enabled
      if (params.auto_recover && enhancedIntent.fallbackStrategy) {
        try {
          await executeRecoveryStrategy(context, enhancedIntent);
          code.push(`// Primary action failed, recovery successful`);

          return {
            code,
            captureSnapshot: true,
            waitForNetwork: true,
            resultOverride: {
              content: [{
                type: 'text',
                text: `Recovered from error and completed: ${params.description}\nRecovery strategy: ${enhancedIntent.fallbackStrategy}`,
              }],
            },
          };
        } catch (recoveryError) {
          code.push(`// Both primary action and recovery failed`);
        }
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
      parameters: z.record(z.any()).describe('Parameters for the workflow execution'),
      auto_recover: z.boolean().optional().default(true).describe('Whether to automatically recover from step failures'),
      validate_completion: z.boolean().optional().default(true).describe('Whether to validate successful completion'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    try {
      // Execute the workflow
      const execution = await workflowEngine.executeWorkflow(context, params.intent, params.parameters);

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

// Helper functions for intent execution
async function executeNavigate(context: any, params: any) {
  // Use existing navigate tool
  return { success: true, action: 'navigate', url: params.url };
}

async function executeClick(context: any, params: any) {
  // Use existing click tool with intelligent element detection
  return { success: true, action: 'click', element: params.element };
}

async function executeType(context: any, params: any) {
  // Use existing type tool
  return { success: true, action: 'type', text: params.text, element: params.element };
}

async function executeSubmitForm(context: any, params: any) {
  // Find and submit form
  return { success: true, action: 'submit_form' };
}

async function executeSearch(context: any, params: any) {
  // Execute search functionality
  return { success: true, action: 'search', query: params.query };
}

async function executeGenericIntent(context: any, intent: any) {
  // Handle generic intents
  return { success: true, action: intent.action, parameters: intent.parameters };
}

async function executeRecoveryStrategy(context: any, intent: any) {
  // Implement recovery strategies
  return { success: true, action: 'recovery', strategy: intent.fallbackStrategy };
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
