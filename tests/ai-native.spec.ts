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

test.describe('AI-native modules', () => {
  test('intent parser should correctly parse various natural language commands', async () => {
    // Import the intent parser directly for unit testing
    const { intentParser } = await import('../lib/ai/intent.js');

    // Test navigation intent
    const navIntent = intentParser.parseIntent('navigate to github.com');
    expect(navIntent.action).toBe('navigate');
    expect(navIntent.parameters.url).toBe('https://github.com');
    expect(navIntent.confidence).toBeGreaterThan(0.8);

    // Test click intent
    const clickIntent = intentParser.parseIntent('click the submit button');
    expect(clickIntent.action).toBe('click');
    expect(clickIntent.parameters.element).toBe('submit');

    // Test type intent
    const typeIntent = intentParser.parseIntent('type "hello world" into the search box');
    expect(typeIntent.action).toBe('type');
    expect(typeIntent.parameters.text).toBe('hello world');
    expect(typeIntent.parameters.element).toBe('search box');

    // Test GitHub-specific intent
    const githubIntent = intentParser.parseIntent('create a new github issue');
    expect(githubIntent.action).toBe('github_create_issue');
    expect(githubIntent.confidence).toBeGreaterThan(0.8);
  });

  test('context manager should track session state', async () => {
    const { aiContextManager } = await import('../lib/ai/context.js');

    const testSessionId = 'test_session_' + Date.now();

    // Test context creation
    const context = aiContextManager.getOrCreateContext(testSessionId);
    expect(context.contextId).toBe(testSessionId);
    expect(context.currentTask).toBe('');

    // Test task updates
    aiContextManager.updateTask(testSessionId, 'Testing AI functionality');
    const updatedContext = aiContextManager.getContext(testSessionId);
    expect(updatedContext.currentTask).toBe('Testing AI functionality');

    // Test success recording
    aiContextManager.recordSuccess(testSessionId, {
      action: 'navigate',
      target: 'https://example.com',
      timestamp: Date.now(),
      success: true,
    });

    const contextWithSuccess = aiContextManager.getContext(testSessionId);
    expect(contextWithSuccess.successfulActions.length).toBe(1);
    expect(contextWithSuccess.successfulActions[0].action).toBe('navigate');

    // Test error recording
    aiContextManager.recordError(testSessionId, {
      errorType: 'click_failed',
      elementSelector: '#submit-btn',
      pageUrl: 'https://example.com',
      recoveryActions: ['auto_detect_elements'],
    });

    const contextWithError = aiContextManager.getContext(testSessionId);
    expect(contextWithError.failurePatterns.length).toBe(1);
    expect(contextWithError.failurePatterns[0].errorType).toBe('click_failed');

    // Test suggestions
    const suggestions = aiContextManager.suggestNextActions(testSessionId, 'https://example.com');
    expect(Array.isArray(suggestions)).toBe(true);

    // Cleanup
    aiContextManager.clearContext(testSessionId);
  });

  test('workflow engine should provide available templates', async () => {
    const { workflowEngine } = await import('../lib/ai/workflow.js');

    const templates = workflowEngine.getTemplates();
    expect(templates.length).toBeGreaterThan(0);

    // Check for expected templates
    const githubTemplate = templates.find(t => t.name === 'github_issue_management');
    expect(githubTemplate).toBeDefined();
    expect(githubTemplate?.requiredParameters).toContain('repository');
    expect(githubTemplate?.requiredParameters).toContain('action');

    const reviewTemplate = templates.find(t => t.name === 'code_review_workflow');
    expect(reviewTemplate).toBeDefined();

    const loginTemplate = templates.find(t => t.name === 'login_workflow');
    expect(loginTemplate).toBeDefined();
  });
});
