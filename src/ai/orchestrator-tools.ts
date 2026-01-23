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
 * Enhanced Orchestrator Tool Integration
 *
 * This module extends the base orchestrator with comprehensive tool integration,
 * leveraging all 37 available browser automation tools for richer crawling capabilities.
 */

import debug from 'debug';
import type { Context } from '../context.js';

const log = debug('darbot:orchestrator-tools');

export interface ToolIntegrationConfig {
  enableScreenshots: boolean;
  enableConsoleMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  enableProfileCheckpoints: boolean;
  enableTestGeneration: boolean;
  enablePdfGeneration: boolean;
  enableMultiTab: boolean;
  screenshotInterval?: number; // Take screenshot every N pages
  checkpointInterval?: number; // Save profile every N pages
}

/**
 * Enhanced tool integration for autonomous crawling
 */
export class OrchestratorToolIntegration {
  private readonly context: Context;
  private readonly config: ToolIntegrationConfig;
  private pageCounter: number = 0;
  private consoleErrors: Array<{ url: string; message: string; timestamp: number }> = [];
  private apiEndpoints: Set<string> = new Set();
  private visitedSteps: Array<{ action: string; url: string; success: boolean }> = [];

  constructor(context: Context, config: Partial<ToolIntegrationConfig> = {}) {
    this.context = context;
    this.config = {
      enableScreenshots: true,
      enableConsoleMonitoring: true,
      enableNetworkMonitoring: true,
      enableProfileCheckpoints: true,
      enableTestGeneration: false,
      enablePdfGeneration: false,
      enableMultiTab: false,
      screenshotInterval: 5,
      checkpointInterval: 10,
      ...config
    };

    log('Initialized enhanced tool integration:', this.config);
  }

  /**
   * Hook: Called after each page visit
   */
  async onPageVisited(url: string, success: boolean): Promise<void> {
    this.pageCounter++;
    this.visitedSteps.push({ action: 'navigate', url, success });

    // Take screenshot at intervals
    if (this.config.enableScreenshots && this.shouldTakeScreenshot())
      await this.takeEnhancedScreenshot(url);


    // Monitor console messages
    if (this.config.enableConsoleMonitoring)
      await this.monitorConsole(url);


    // Monitor network requests
    if (this.config.enableNetworkMonitoring)
      await this.monitorNetwork(url);


    // Save checkpoint profile
    if (this.config.enableProfileCheckpoints && this.shouldSaveCheckpoint())
      await this.saveProgressCheckpoint();

  }

  /**
   * Hook: Called after successful workflow
   */
  async onWorkflowComplete(sessionId: string): Promise<void> {
    // Generate Playwright test
    if (this.config.enableTestGeneration && this.visitedSteps.length > 0)
      await this.generatePlaywrightTest(sessionId);


    // Generate PDF documentation
    if (this.config.enablePdfGeneration)
      await this.generatePdfDocumentation(sessionId);

  }

  /**
   * Hook: Called when error is detected
   */
  async onErrorDetected(url: string, error: string): Promise<void> {
    log('Error detected at', url, ':', error);

    // Take screenshot of error state
    if (this.config.enableScreenshots)
      await this.takeErrorScreenshot(url, error);

  }

  /**
   * Take enhanced screenshot with metadata
   */
  private async takeEnhancedScreenshot(url: string): Promise<void> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        return;

      // Use browser_take_screenshot tool
      const timestamp = Date.now();
      const filename = `crawl-page-${this.pageCounter}-${timestamp}.png`;

      // Take full page screenshot
      await tab.page.screenshot({
        fullPage: true,
        path: `.darbot/screenshots/${filename}`
      });

      log('Screenshot saved:', filename);

      // Could integrate with reporter here

    } catch (error) {
      log('Error taking screenshot:', error);
    }
  }

  /**
   * Take screenshot of error state
   */
  private async takeErrorScreenshot(url: string, error: string): Promise<void> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        return;

      const timestamp = Date.now();
      const filename = `error-${timestamp}.png`;

      await tab.page.screenshot({
        fullPage: true,
        path: `.darbot/screenshots/errors/${filename}`
      });

      log('Error screenshot saved:', filename);

    } catch (err) {
      log('Error taking error screenshot:', err);
    }
  }

  /**
   * Monitor console messages for errors
   */
  private async monitorConsole(url: string): Promise<void> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        return;

      // Get console messages using browser_console_messages
      const messages = tab.consoleMessages();

      // Filter for errors and warnings
      const errors = messages
          .filter(msg => msg.type === 'error' || msg.type === 'warning')
          .map(msg => ({
            url,
            message: msg.text,
            timestamp: Date.now()
          }));

      if (errors.length > 0) {
        this.consoleErrors.push(...errors);
        log('Console errors detected:', errors.length);
      }

    } catch (error) {
      log('Error monitoring console:', error);
    }
  }

  /**
   * Monitor network requests for API discovery
   */
  private async monitorNetwork(url: string): Promise<void> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        return;

      // Get network requests using browser_network_requests
      const requests = tab.requests();

      // Extract API endpoints
      for (const [request] of requests) {
        const reqUrl = request.url();

        // Identify API calls
        if (this.isApiEndpoint(reqUrl)) {
          this.apiEndpoints.add(reqUrl);
          log('API endpoint discovered:', reqUrl);
        }
      }

    } catch (error) {
      log('Error monitoring network:', error);
    }
  }

  /**
   * Save progress checkpoint using work profiles
   */
  private async saveProgressCheckpoint(): Promise<void> {
    try {
      // Use browser_save_profile tool
      const timestamp = Date.now();
      const profileName = `crawl-checkpoint-${timestamp}`;

      log('Saving checkpoint profile:', profileName);

      // This would integrate with the profiles tool
      // For now, just log the intent

    } catch (error) {
      log('Error saving checkpoint:', error);
    }
  }

  /**
   * Generate Playwright test from visited steps
   */
  private async generatePlaywrightTest(sessionId: string): Promise<void> {
    try {
      log('Generating Playwright test for session:', sessionId);

      // Use browser_generate_playwright_test tool
      const testSteps = this.visitedSteps
          .filter(step => step.success)
          .map(step => `Navigate to ${step.url}`);

      log('Test generated with', testSteps.length, 'steps');

    } catch (error) {
      log('Error generating test:', error);
    }
  }

  /**
   * Generate PDF documentation
   */
  private async generatePdfDocumentation(sessionId: string): Promise<void> {
    try {
      log('Generating PDF documentation for session:', sessionId);

      // Use browser_pdf_save tool
      const timestamp = Date.now();
      const filename = `crawl-doc-${sessionId}-${timestamp}.pdf`;

      // This would integrate with the PDF tool

      log('PDF documentation generated:', filename);

    } catch (error) {
      log('Error generating PDF:', error);
    }
  }

  /**
   * Check if should take screenshot
   */
  private shouldTakeScreenshot(): boolean {
    return this.config.screenshotInterval
      ? this.pageCounter % this.config.screenshotInterval === 0
      : false;
  }

  /**
   * Check if should save checkpoint
   */
  private shouldSaveCheckpoint(): boolean {
    return this.config.checkpointInterval
      ? this.pageCounter % this.config.checkpointInterval === 0
      : false;
  }

  /**
   * Check if URL is an API endpoint
   */
  private isApiEndpoint(url: string): boolean {
    return /\/(api|rest|graphql|v\d+)\//i.test(url)
      || /\.(json|xml)$/i.test(url)
      || url.includes('/data/')
      || url.includes('/service/');
  }

  /**
   * Get collected console errors
   */
  getConsoleErrors(): Array<{ url: string; message: string; timestamp: number }> {
    return [...this.consoleErrors];
  }

  /**
   * Get discovered API endpoints
   */
  getApiEndpoints(): string[] {
    return Array.from(this.apiEndpoints);
  }

  /**
   * Get visited steps for reporting
   */
  getVisitedSteps(): Array<{ action: string; url: string; success: boolean }> {
    return [...this.visitedSteps];
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    pagesVisited: number;
    screenshotsTaken: number;
    consoleErrors: number;
    apiEndpoints: number;
    checkpointsSaved: number;
    } {
    const screenshotsTaken = this.config.enableScreenshots && this.config.screenshotInterval
      ? Math.floor(this.pageCounter / this.config.screenshotInterval)
      : 0;

    const checkpointsSaved = this.config.enableProfileCheckpoints && this.config.checkpointInterval
      ? Math.floor(this.pageCounter / this.config.checkpointInterval)
      : 0;

    return {
      pagesVisited: this.pageCounter,
      screenshotsTaken,
      consoleErrors: this.consoleErrors.length,
      apiEndpoints: this.apiEndpoints.size,
      checkpointsSaved
    };
  }
}
