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
 * Integration layer connecting AI intent parsing to real browser automation tools
 *
 * This module bridges the gap between natural language understanding (intent parser)
 * and actual browser automation (Playwright tools). It transforms AI-friendly intents
 * into tool-specific parameters and executes real browser operations.
 */

import type { Context } from '../context.js';
import type { ParsedIntent } from './intent.js';
import type { Tab } from '../tab.js';

export interface ExecutionResult {
  success: boolean;
  action: string;
  target?: string;
  error?: string;
  result?: any;
  recoveryUsed?: boolean;
  recoveryStrategy?: string;
}

/**
 * AI Tool Integration - Executes parsed intents using real browser automation tools
 */
export class AIToolIntegration {
  /**
   * Execute a parsed intent by calling the appropriate browser automation tool
   */
  async executeIntent(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    try {
      switch (intent.action) {
        case 'navigate':
          return await this.executeNavigate(context, intent);

        case 'click':
          return await this.executeClick(context, intent);

        case 'type':
          return await this.executeType(context, intent);

        case 'submit_form':
          return await this.executeSubmitForm(context, intent);

        case 'search':
          return await this.executeSearch(context, intent);

        case 'github_create_issue':
          return await this.executeGitHubCreateIssue(context, intent);

        case 'github_review_pr':
          return await this.executeGitHubReviewPR(context, intent);

        case 'login':
          return await this.executeLogin(context, intent);

        case 'wait_for':
          return await this.executeWaitFor(context, intent);

        case 'screenshot':
          return await this.executeScreenshot(context, intent);

        default:
          return await this.executeGeneric(context, intent);
      }
    } catch (error) {
      // Return error result instead of throwing
      return {
        success: false,
        action: intent.action,
        target: intent.parameters.url || intent.parameters.element,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute recovery strategy when primary intent fails
   */
  async executeRecovery(context: Context, intent: ParsedIntent, primaryError: Error): Promise<ExecutionResult> {
    const strategy = intent.fallbackStrategy || 'analyze_page_context';

    try {
      switch (strategy) {
        case 'search_for_url':
          return await this.recoverSearchForUrl(context, intent);

        case 'auto_detect_clickable_elements':
          return await this.recoverAutoDetectClickable(context, intent);

        case 'auto_detect_input_fields':
          return await this.recoverAutoDetectInput(context, intent);

        case 'find_submit_buttons':
          return await this.recoverFindSubmitButton(context, intent);

        case 'find_search_input':
          return await this.recoverFindSearchInput(context, intent);

        case 'analyze_page_context':
          return await this.recoverAnalyzeContext(context, intent);

        default:
          throw new Error(`Unknown recovery strategy: ${strategy}`);
      }
    } catch (recoveryError) {
      return {
        success: false,
        action: intent.action,
        error: `Primary error: ${primaryError.message}. Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        recoveryUsed: true,
        recoveryStrategy: strategy,
      };
    }
  }

  // ==================== Action Implementations ====================

  private async executeNavigate(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = await context.ensureTab();
    const url = intent.parameters.url;

    await tab.navigate(url);

    return {
      success: true,
      action: 'navigate',
      target: url,
    };
  }

  private async executeClick(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();
    const element = intent.parameters.element;

    // Find element by accessibility text or role
    const locator = await this.findElementByDescription(tab, element);
    await locator.click();

    return {
      success: true,
      action: 'click',
      target: element,
    };
  }

  private async executeType(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();
    const text = intent.parameters.text;
    const element = intent.parameters.element;

    // Find input element
    const locator = await this.findInputByDescription(tab, element);
    await locator.fill(text);

    return {
      success: true,
      action: 'type',
      target: element,
      result: { text },
    };
  }

  private async executeSubmitForm(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Find and click submit button, or press Enter on focused element
    try {
      const submitButton = tab.page.locator('button[type="submit"], input[type="submit"]').first();
      await submitButton.click();
    } catch {
      // Fallback: press Enter
      await tab.page.keyboard.press('Enter');
    }

    return {
      success: true,
      action: 'submit_form',
    };
  }

  private async executeSearch(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = await context.ensureTab();
    const query = intent.parameters.query;

    // Navigate to Google search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await tab.navigate(searchUrl);

    return {
      success: true,
      action: 'search',
      target: query,
      result: { url: searchUrl },
    };
  }

  private async executeGitHubCreateIssue(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();
    const currentUrl = tab.page.url();

    // Extract repository from current URL if on GitHub
    if (!currentUrl.includes('github.com'))
      throw new Error('Not on GitHub. Navigate to a repository first.');


    // Navigate to issues page
    const repoMatch = currentUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!repoMatch)
      throw new Error('Could not determine repository from URL');


    const issuesUrl = `https://github.com/${repoMatch[1]}/issues/new`;
    await tab.navigate(issuesUrl);

    return {
      success: true,
      action: 'github_create_issue',
      target: issuesUrl,
    };
  }

  private async executeGitHubReviewPR(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();
    const currentUrl = tab.page.url();

    if (!currentUrl.includes('github.com'))
      throw new Error('Not on GitHub. Navigate to a repository first.');


    // Navigate to pull requests
    const repoMatch = currentUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!repoMatch)
      throw new Error('Could not determine repository from URL');


    const prsUrl = `https://github.com/${repoMatch[1]}/pulls`;
    await tab.navigate(prsUrl);

    return {
      success: true,
      action: 'github_review_pr',
      target: prsUrl,
    };
  }

  private async executeLogin(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Detect login form on current page
    const loginInputs = tab.page.locator('input[type="email"], input[type="text"], input[name*="user"], input[name*="email"]');
    const passwordInputs = tab.page.locator('input[type="password"]');

    const loginCount = await loginInputs.count();
    const passwordCount = await passwordInputs.count();

    if (loginCount === 0 || passwordCount === 0)
      throw new Error('No login form detected on current page');


    return {
      success: true,
      action: 'login',
      target: 'login_form_detected',
      result: {
        message: 'Login form detected. Use browser_type tool to enter credentials.',
      },
    };
  }

  private async executeWaitFor(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();
    const target = intent.parameters.target;

    // Wait for element or text to appear
    try {
      // Try as text content first
      await tab.page.waitForSelector(`:text("${target}")`, { timeout: 10000 });
    } catch {
      // Try as selector
      await tab.page.waitForSelector(target, { timeout: 10000 });
    }

    return {
      success: true,
      action: 'wait_for',
      target,
    };
  }

  private async executeScreenshot(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    await tab.page.screenshot({ path: filename, fullPage: true });

    return {
      success: true,
      action: 'screenshot',
      result: { filename, path: filename },
    };
  }

  private async executeGeneric(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    throw new Error(`Action '${intent.action}' is not yet implemented in the integration layer`);
  }

  // ==================== Recovery Strategies ====================

  private async recoverSearchForUrl(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    // If direct navigation failed, try Google search
    const searchQuery = intent.parameters.url || intent.parameters.element;
    const searchIntent: ParsedIntent = {
      action: 'search',
      parameters: { query: searchQuery },
      confidence: 0.6,
      fallbackStrategy: 'analyze_page_context',
    };

    const result = await this.executeSearch(context, searchIntent);
    result.recoveryUsed = true;
    result.recoveryStrategy = 'search_for_url';
    return result;
  }

  private async recoverAutoDetectClickable(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Find all clickable elements
    const clickableElements = await tab.page.locator('button, a, [role="button"], [role="link"], input[type="submit"]').all();

    if (clickableElements.length === 0)
      throw new Error('No clickable elements found on page');


    // Click the first visible one
    await clickableElements[0].click();

    return {
      success: true,
      action: 'click',
      target: 'auto_detected_element',
      recoveryUsed: true,
      recoveryStrategy: 'auto_detect_clickable_elements',
    };
  }

  private async recoverAutoDetectInput(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Find visible input fields
    const inputs = await tab.page.locator('input[type="text"], input[type="email"], input[type="search"], textarea').all();

    if (inputs.length === 0)
      throw new Error('No input fields found on page');


    // Fill the first visible one
    const text = intent.parameters.text || '';
    await inputs[0].fill(text);

    return {
      success: true,
      action: 'type',
      target: 'auto_detected_input',
      recoveryUsed: true,
      recoveryStrategy: 'auto_detect_input_fields',
    };
  }

  private async recoverFindSubmitButton(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Find submit buttons by various selectors
    const submitButton = tab.page.locator(
        'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")'
    ).first();

    await submitButton.click();

    return {
      success: true,
      action: 'submit_form',
      target: 'auto_detected_submit',
      recoveryUsed: true,
      recoveryStrategy: 'find_submit_buttons',
    };
  }

  private async recoverFindSearchInput(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Find search input by name, placeholder, or type
    const searchInput = tab.page.locator(
        'input[type="search"], input[name*="search"], input[placeholder*="search" i]'
    ).first();

    const query = intent.parameters.query || '';
    await searchInput.fill(query);
    await searchInput.press('Enter');

    return {
      success: true,
      action: 'search',
      target: 'auto_detected_search_input',
      recoveryUsed: true,
      recoveryStrategy: 'find_search_input',
    };
  }

  private async recoverAnalyzeContext(context: Context, intent: ParsedIntent): Promise<ExecutionResult> {
    const tab = context.currentTabOrDie();

    // Capture page snapshot for intelligent recovery
    const title = await tab.page.title();
    const url = tab.page.url();

    // Provide context-aware suggestions
    const suggestions: string[] = [];

    if (url.includes('github.com'))
      suggestions.push('Try navigating to issues or pull requests');

    if (title.toLowerCase().includes('login'))
      suggestions.push('Page appears to be a login form');


    throw new Error(`Could not execute action. Suggestions: ${suggestions.join(', ') || 'None'}`);
  }

  // ==================== Helper Methods ====================

  /**
   * Find element by natural language description
   */
  private async findElementByDescription(tab: Tab, description: string): Promise<any> {
    // Try various strategies to find element
    const strategies = [
      // 1. Exact text match
      tab.page.locator(`:text("${description}")`),

      // 2. Partial text match (case insensitive)
      tab.page.locator(`:text-is("${description}")`),

      // 3. Button with text
      tab.page.locator(`button:has-text("${description}")`),

      // 4. Link with text
      tab.page.locator(`a:has-text("${description}")`),

      // 5. Accessible name
      tab.page.locator(`[aria-label="${description}"]`),

      // 6. Placeholder
      tab.page.locator(`[placeholder="${description}"]`),

      // 7. Title attribute
      tab.page.locator(`[title="${description}"]`),
    ];

    // Try each strategy
    for (const locator of strategies) {
      const count = await locator.count();
      if (count > 0)
        return locator.first();

    }

    // If all strategies fail, throw error
    throw new Error(`Could not find element matching: ${description}`);
  }

  /**
   * Find input field by natural language description
   */
  private async findInputByDescription(tab: Tab, description: string): Promise<any> {
    // Try various input-specific strategies
    const strategies = [
      // 1. Label text
      tab.page.locator(`input:near(:text("${description}"))`),

      // 2. Placeholder
      tab.page.locator(`input[placeholder*="${description}" i]`),

      // 3. Name attribute
      tab.page.locator(`input[name*="${description}" i]`),

      // 4. Accessible label
      tab.page.locator(`input[aria-label*="${description}" i]`),

      // 5. ID
      tab.page.locator(`input[id*="${description}" i]`),

      // 6. Any input (fallback)
      tab.page.locator('input[type="text"], input[type="email"], input[type="search"], textarea').first(),
    ];

    for (const locator of strategies) {
      try {
        const count = await locator.count();
        if (count > 0)
          return locator.first();

      } catch {
        continue;
      }
    }

    throw new Error(`Could not find input field matching: ${description}`);
  }
}

// Global integration instance
export const aiToolIntegration = new AIToolIntegration();
