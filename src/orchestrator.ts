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

import debug from 'debug';
import { MemoryManager, type MemoryConfig } from './memory.js';
import { BFSPlanner, type PlannerConfig, type CrawlAction, type PlannerObservation } from './planner.js';
import { CrawlReporter, type ReporterConfig } from './reporter.js';
import { GuardrailSystem, type GuardrailConfig, type ActionContext } from './guardrails.js';
import { Context } from './context.js';

const log = debug('darbot:orchestrator');

export interface OrchestratorConfig {
  startUrl: string;
  goal?: string;
  sessionId?: string;
  maxDepth?: number;
  maxPages?: number;
  timeoutMs?: number;

  memory?: MemoryConfig;
  planner?: Partial<PlannerConfig>;
  reporter?: Partial<ReporterConfig>;
  guardrails?: Partial<GuardrailConfig>;

  generateReport?: boolean;
  takeScreenshots?: boolean;
  allowedDomains?: string[];
  verbose?: boolean;
}

export interface CrawlSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  stats: {
    pagesVisited: number;
    actionsPerformed: number;
    errorsEncountered: number;
    reportPath?: string;
  };
  status: 'running' | 'completed' | 'error' | 'cancelled';
}

/**
 * Main orchestrator for autonomous browser crawling
 */
export class CrawlOrchestrator {
  private readonly config: OrchestratorConfig;
  private readonly memory: MemoryManager;
  private readonly planner: BFSPlanner;
  private readonly reporter: CrawlReporter;
  private readonly guardrails: GuardrailSystem;
  private readonly context: Context;

  private session: CrawlSession;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(context: Context, config: OrchestratorConfig) {
    this.context = context;
    this.config = {
      sessionId: this.generateSessionId(),
      maxDepth: 3,
      maxPages: 50,
      timeoutMs: 300000,
      generateReport: true,
      takeScreenshots: true,
      verbose: false,
      ...config
    };

    // Initialize subsystems
    this.memory = new MemoryManager(this.config.memory || { enabled: true });

    const plannerConfig: PlannerConfig = {
      maxDepth: this.config.maxDepth!,
      maxPages: this.config.maxPages!,
      timeout: this.config.timeoutMs!,
      allowedDomains: this.config.allowedDomains,
      strategy: 'bfs',
      goalDescription: this.config.goal,
      ...this.config.planner
    };
    this.planner = new BFSPlanner(plannerConfig, this.memory);

    this.reporter = new CrawlReporter(
      this.config.sessionId!,
      this.config.startUrl,
      this.config.goal,
      this.config.reporter
    );

    this.guardrails = new GuardrailSystem({
      maxDepth: this.config.maxDepth,
      timeoutMs: this.config.timeoutMs,
      allowedDomains: this.config.allowedDomains,
      ...this.config.guardrails
    });

    // Initialize session
    this.session = {
      sessionId: this.config.sessionId!,
      startTime: Date.now(),
      stats: {
        pagesVisited: 0,
        actionsPerformed: 0,
        errorsEncountered: 0
      },
      status: 'running'
    };

    log('Initialized orchestrator with config:', this.config);
  }

  /**
   * Start autonomous crawling session
   */
  async startCrawling(): Promise<CrawlSession> {
    if (this.isRunning)
      throw new Error('Crawling session already running');


    this.isRunning = true;
    this.shouldStop = false;

    try {
      log('Starting autonomous crawling session:', this.session.sessionId);

      // Initialize planner with start URL
      await this.planner.initialize(this.config.startUrl);

      // Navigate to start URL
      await this.navigateToUrl(this.config.startUrl);

      // Main crawling loop
      while (!this.shouldStop && this.isRunning) {
        try {
          const success = await this.performCrawlStep();
          if (!success)
            break;


          // Small delay between actions
          await this.sleep(1000);

        } catch (error) {
          log('Error in crawl step:', error);
          this.reporter.addError(this.getCurrentUrl(), String(error));
          this.session.stats.errorsEncountered++;

          // Continue with next action after error
          await this.sleep(2000);
        }
      }

    } catch (error) {
      log('Fatal error in crawling session:', error);
      this.session.status = 'error';
      this.reporter.addError(this.config.startUrl, String(error));
    } finally {
      await this.finalizeCrawling();
    }

    return this.session;
  }

  /**
   * Stop the crawling session
   */
  async stopCrawling(): Promise<void> {
    log('Stopping crawling session');
    this.shouldStop = true;
    this.session.status = 'cancelled';
  }

  /**
   * Perform a single crawl step
   */
  private async performCrawlStep(): Promise<boolean> {
    try {
      // Get current page observation
      const observation = await this.getCurrentObservation();

      // Plan next action
      const action = await this.planner.planNextAction(observation);

      log('Planned action:', action.type, action.target || action.url || action.reason);

      // Validate action with guardrails
      const actionContext = this.getActionContext();
      const validation = await this.guardrails.validateAction(action, actionContext);

      if (!validation.allowed) {
        log('Action blocked by guardrails:', validation.reason);
        this.reporter.addError(observation.url, `Action blocked: ${validation.reason}`);
        return false;
      }

      // Execute action
      const success = await this.executeAction(action);

      if (success) {
        this.session.stats.actionsPerformed++;
        this.guardrails.recordAction(action, observation.url);
      }

      // Check if we should finish
      if (action.type === 'finish') {
        log('Crawling finished:', action.reason);
        return false;
      }

      return success;

    } catch (error) {
      log('Error in crawl step:', error);
      throw error;
    }
  }

  /**
   * Get current page observation
   */
  private async getCurrentObservation(): Promise<PlannerObservation> {
    const tab = this.context.currentTabOrDie();
    if (!tab)
      throw new Error('No active tab available');


    const page = tab.page;
    const url = page.url();

    // Get page title
    const title = await page.title().catch(() => 'Untitled');

    // Get accessibility snapshot
    const snapshot = await page.accessibility.snapshot() || {};
    const domSnapshot = JSON.stringify(snapshot);

    // Extract links
    const links = await this.extractLinks(page);

    // Extract clickable elements
    const clickableElements = await this.extractClickableElements(page);

    return {
      url,
      title,
      domSnapshot,
      links,
      clickableElements
    };
  }

  /**
   * Extract links from current page
   */
  private async extractLinks(page: any): Promise<Array<{ text: string; href: string; selector: string }>> {
    try {
      return await page.evaluate(() => {
        const links: Array<{ text: string; href: string; selector: string }> = [];
        const anchorElements = document.querySelectorAll('a[href]');

        anchorElements.forEach((element, index) => {
          const href = element.getAttribute('href');
          const text = element.textContent?.trim() || '';

          if (href && text) {
            links.push({
              text: text.substring(0, 100), // Limit text length
              href: href,
              selector: `a[href="${href}"]:nth-of-type(${index + 1})`
            });
          }
        });

        return links.slice(0, 50); // Limit number of links
      });
    } catch (error) {
      log('Error extracting links:', error);
      return [];
    }
  }

  /**
   * Extract clickable elements from current page
   */
  private async extractClickableElements(page: any): Promise<Array<{ text: string; selector: string; tag: string }>> {
    try {
      return await page.evaluate(() => {
        const elements: Array<{ text: string; selector: string; tag: string }> = [];
        const clickableSelectors = 'button, input[type="button"], input[type="submit"], [role="button"], .btn, .button';
        const clickableElements = document.querySelectorAll(clickableSelectors);

        clickableElements.forEach((element, index) => {
          const text = element.textContent?.trim() || element.getAttribute('value') || element.getAttribute('aria-label') || '';
          const tagName = element.tagName.toLowerCase();

          if (text && (element as any).offsetParent !== null) { // Only visible elements
            elements.push({
              text: text.substring(0, 50), // Limit text length
              selector: `${tagName}:nth-of-type(${index + 1})`,
              tag: tagName
            });
          }
        });

        return elements.slice(0, 20); // Limit number of elements
      });
    } catch (error) {
      log('Error extracting clickable elements:', error);
      return [];
    }
  }

  /**
   * Execute a crawl action
   */
  private async executeAction(action: CrawlAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'navigate':
          if (action.url)
            return await this.navigateToUrl(action.url);

          break;

        case 'click':
          if (action.target)
            return await this.clickElement(action.target);

          break;

        case 'type':
          if (action.target && action.text)
            return await this.typeText(action.target, action.text);

          break;

        case 'wait':
          await this.sleep(2000);
          return true;

        case 'snapshot':
          return await this.takeSnapshot();

        case 'finish':
          return true;
      }

      return false;
    } catch (error) {
      log('Error executing action:', error);
      return false;
    }
  }

  /**
   * Navigate to a URL
   */
  private async navigateToUrl(url: string): Promise<boolean> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        throw new Error('No active tab available');


      log('Navigating to:', url);
      await tab.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      this.session.stats.pagesVisited++;

      // Take screenshot if enabled
      if (this.config.takeScreenshots)
        await this.takeScreenshot();


      // Store state in memory
      const observation = await this.getCurrentObservation();
      if (this.memory.enabled) {
        await this.memory.storeState(
            url,
            observation.title,
            observation.domSnapshot,
            undefined, // Screenshot handled separately
            observation.links.map(link => link.href)
        );
      }

      // Add to report
      this.reporter.addState({
        url,
        title: observation.title,
        stateHash: this.memory.constructor.name + Date.now().toString(),
        timestamp: Date.now(),
        links: observation.links.map(link => link.href),
        visited: true
      });

      return true;
    } catch (error) {
      log('Navigation error:', error);
      this.reporter.addError(url, String(error));
      return false;
    }
  }

  /**
   * Click an element
   */
  private async clickElement(selector: string): Promise<boolean> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        throw new Error('No active tab available');


      log('Clicking element:', selector);
      await tab.page.click(selector, { timeout: 10000 });
      await tab.page.waitForTimeout(2000); // Wait for potential page changes

      return true;
    } catch (error) {
      log('Click error:', error);
      return false;
    }
  }

  /**
   * Type text into an element
   */
  private async typeText(selector: string, text: string): Promise<boolean> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        throw new Error('No active tab available');


      log('Typing text into:', selector);
      await tab.page.fill(selector, text);

      return true;
    } catch (error) {
      log('Type error:', error);
      return false;
    }
  }

  /**
   * Take a screenshot
   */
  private async takeScreenshot(): Promise<boolean> {
    try {
      const tab = this.context.currentTabOrDie();
      if (!tab)
        return false;


      const screenshot = await tab.page.screenshot({
        type: 'png',
        fullPage: false
      });

      // Store screenshot in memory system
      const url = tab.page.url();
      const title = await tab.page.title().catch(() => 'Untitled');
      const observation = await this.getCurrentObservation();

      if (this.memory.enabled) {
        await this.memory.storeState(
            url,
            title,
            observation.domSnapshot,
            screenshot,
            observation.links.map(link => link.href)
        );
      }

      return true;
    } catch (error) {
      log('Screenshot error:', error);
      return false;
    }
  }

  /**
   * Take accessibility snapshot
   */
  private async takeSnapshot(): Promise<boolean> {
    try {
      const observation = await this.getCurrentObservation();
      log('Took accessibility snapshot for:', observation.url);
      return true;
    } catch (error) {
      log('Snapshot error:', error);
      return false;
    }
  }

  /**
   * Get action context for guardrails
   */
  private getActionContext(): ActionContext {
    const stats = this.planner.getStats();

    return {
      currentUrl: this.getCurrentUrl(),
      visitedUrls: stats.visitedUrls || [],
      currentDepth: stats.currentDepth || 0,
      sessionStartTime: this.session.startTime,
      lastActionTime: Date.now()
    };
  }

  /**
   * Get current URL from the active tab
   */
  private getCurrentUrl(): string {
    try {
      const tab = this.context.currentTabOrDie();
      return tab.page.url();
    } catch {
      return '';
    }
  }

  /**
   * Finalize crawling session
   */
  private async finalizeCrawling(): Promise<void> {
    this.isRunning = false;
    this.session.endTime = Date.now();

    if (this.session.status === 'running')
      this.session.status = 'completed';


    // Generate report if enabled
    if (this.config.generateReport) {
      try {
        const reportPath = await this.reporter.generateReport();
        this.session.stats.reportPath = reportPath;
        log('Generated report:', reportPath);
      } catch (error) {
        log('Error generating report:', error);
      }
    }

    log('Crawling session finalized:', this.session);
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `crawl_${timestamp}_${random}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current session status
   */
  getSession(): CrawlSession {
    return { ...this.session };
  }

  /**
   * Get crawling statistics
   */
  getStats() {
    return {
      session: this.session,
      planner: this.planner.getStats(),
      guardrails: this.guardrails.getStats(),
      memory: {
        enabled: this.memory.enabled
      }
    };
  }
}
