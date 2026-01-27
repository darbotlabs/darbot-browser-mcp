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

import debug from 'debug';
import { MemoryManager } from '../ai/memory.js';
import { MLBasedScorer } from '../ai/ml-scorer.js';

const log = debug('darbot:planner');

export interface PlannerConfig {
  maxDepth: number;
  maxPages: number;
  timeout: number;
  allowedDomains?: string[];
  excludePatterns?: RegExp[];
  strategy: 'bfs' | 'dfs' | 'focused';
  goalDescription?: string;
}

export interface CrawlAction {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'snapshot' | 'finish';
  target?: string;
  text?: string;
  url?: string;
  reason: string;
  priority: number;
}

export interface PlannerObservation {
  url: string;
  title: string;
  domSnapshot: string;
  links: Array<{ text: string; href: string; selector: string }>;
  clickableElements: Array<{ text: string; selector: string; tag: string }>;
  error?: string;
}

/**
 * BFS Planner for autonomous site crawling
 */
export class BFSPlanner {
  private readonly config: PlannerConfig;
  private readonly memory: MemoryManager;
  private readonly visitQueue: Array<{ url: string; depth: number; parent?: string }>;
  private readonly visited: Set<string>;
  private readonly mlScorer: MLBasedScorer;
  private currentDepth: number = 0;
  private pagesVisited: number = 0;

  constructor(config: PlannerConfig, memory: MemoryManager) {
    this.config = {
      ...config,
      // Set default strategy if not provided
      strategy: config.strategy || 'bfs'
    };
    this.memory = memory;
    this.visitQueue = [];
    this.visited = new Set();

    // Initialize ML-based scorer with goal description
    this.mlScorer = new MLBasedScorer(config.goalDescription || '');
    log('Initialized ML-based scorer with goal:', config.goalDescription);
  }

  /**
   * Plan the next action based on current observation and goal
   */
  async planNextAction(observation: PlannerObservation): Promise<CrawlAction> {
    try {
      log('Planning next action for:', observation.url);

      // Check if we should finish crawling
      if (this.shouldFinish(observation)) {
        return {
          type: 'finish',
          reason: this.getFinishReason(),
          priority: 1
        };
      }

      // Mark current URL as visited
      this.visited.add(observation.url);
      this.pagesVisited++;

      // Learn from successful navigation (no error)
      if (!observation.error) {
        this.mlScorer.learn(observation.url, true);
        log('ML scorer learned from successful visit:', observation.url);
      } else {
        this.mlScorer.learn(observation.url, false);
        log('ML scorer learned from failed visit:', observation.url);
      }

      // Store current state in memory
      if (this.memory.enabled) {
        await this.memory.storeState(
            observation.url,
            observation.title,
            observation.domSnapshot,
            undefined, // Screenshots handled separately
            observation.links.map(link => link.href)
        );
      }

      // Extract and queue new links
      await this.extractAndQueueLinks(observation);

      // Get next URL to visit
      const nextTarget = this.getNextTarget();
      if (nextTarget) {
        return {
          type: 'navigate',
          url: nextTarget.url,
          reason: `BFS navigation to depth ${nextTarget.depth}: ${nextTarget.url}`,
          priority: this.calculatePriority(nextTarget.url)
        };
      }

      // If no more URLs to visit, check for clickable elements on current page
      const clickTarget = this.findBestClickTarget(observation);
      if (clickTarget) {
        return {
          type: 'click',
          target: clickTarget.selector,
          reason: `Clicking "${clickTarget.text}" to discover new content`,
          priority: 2
        };
      }

      // No more actions possible
      return {
        type: 'finish',
        reason: 'No more discoverable content within constraints',
        priority: 1
      };

    } catch (error) {
      log('Error in planning:', error);
      return {
        type: 'finish',
        reason: `Planning error: ${error}`,
        priority: 1
      };
    }
  }

  /**
   * Initialize the planner with a starting URL
   */
  async initialize(startUrl: string): Promise<void> {
    this.visitQueue.push({ url: startUrl, depth: 0 });
    log('Initialized BFS planner with start URL:', startUrl);
  }

  /**
   * Extract links from observation and add to queue
   */
  private async extractAndQueueLinks(observation: PlannerObservation): Promise<void> {
    const currentDepth = this.getCurrentDepth(observation.url);

    for (const link of observation.links) {
      const normalizedUrl = this.normalizeUrl(link.href, observation.url);

      if (this.shouldVisitUrl(normalizedUrl, currentDepth + 1)) {
        if (!this.visited.has(normalizedUrl) && !this.isQueued(normalizedUrl)) {
          this.visitQueue.push({
            url: normalizedUrl,
            depth: currentDepth + 1,
            parent: observation.url
          });
          log('Queued URL:', normalizedUrl, 'at depth', currentDepth + 1);
        }
      }
    }

    // Sort queue by priority (breadth-first)
    this.visitQueue.sort((a, b) => {
      if (a.depth !== b.depth)
        return a.depth - b.depth;
      return this.calculatePriority(b.url) - this.calculatePriority(a.url);
    });
  }

  /**
   * Get the next target URL from the queue
   */
  private getNextTarget(): { url: string; depth: number; parent?: string } | null {
    while (this.visitQueue.length > 0) {
      const target = this.visitQueue.shift()!;
      if (!this.visited.has(target.url) && this.shouldVisitUrl(target.url, target.depth))
        return target;

    }
    return null;
  }

  /**
   * Find the best clickable element to interact with
   */
  private findBestClickTarget(observation: PlannerObservation): { selector: string; text: string } | null {
    const clickableElements = observation.clickableElements
        .filter(el => this.isInterestingElement(el))
        .sort((a, b) => this.calculateElementPriority(b) - this.calculateElementPriority(a));

    return clickableElements.length > 0 ? clickableElements[0] : null;
  }

  /**
   * Check if an element is interesting to click
   */
  private isInterestingElement(element: { text: string; selector: string; tag: string }): boolean {
    const text = element.text.toLowerCase();
    const tag = element.tag.toLowerCase();

    // Avoid navigation elements we might get stuck in
    const avoidPatterns = [
      /back/i, /previous/i, /close/i, /cancel/i, /logout/i, /sign.?out/i,
      /advertisement/i, /ad/i, /sponsor/i, /cookie/i, /privacy/i
    ];

    if (avoidPatterns.some(pattern => pattern.test(text)))
      return false;


    // Prefer buttons and links with meaningful text
    if (['button', 'a', 'input'].includes(tag) && text.length > 2)
      return true;


    return false;
  }

  /**
   * Calculate priority for clicking an element using ML-based scoring
   */
  private calculateElementPriority(element: { text: string; selector: string; tag: string }): number {
    // Use ML-based scorer for intelligent element prioritization
    const context = {
      goal: this.config.goalDescription,
      visitedUrls: this.visited,
      successfulUrls: this.visited,
      currentDepth: this.currentDepth
    };

    const score = this.mlScorer.scoreElement(element, context);

    // Convert 0-1 score to priority range (0-10)
    return score * 10;
  }

  /**
   * Calculate priority for visiting a URL using ML-based scoring
   */
  private calculatePriority(url: string): number {
    // Use ML-based scorer for intelligent URL prioritization
    const context = {
      goal: this.config.goalDescription,
      visitedUrls: this.visited,
      successfulUrls: this.visited,
      currentDepth: this.currentDepth
    };

    const score = this.mlScorer.scoreUrl(url, context);

    // Convert 0-1 score to priority range (0-10)
    return score * 10;
  }

  /**
   * Check if we should visit a URL
   */
  private shouldVisitUrl(url: string, depth: number): boolean {
    if (depth > this.config.maxDepth)
      return false;


    if (this.pagesVisited >= this.config.maxPages)
      return false;


    // Check allowed domains
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      try {
        const urlObj = new URL(url);
        const allowed = this.config.allowedDomains.some(domain =>
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
        if (!allowed)
          return false;

      } catch {
        return false;
      }
    }

    // Check exclude patterns
    if (this.config.excludePatterns) {
      if (this.config.excludePatterns.some(pattern => pattern.test(url)))
        return false;

    }

    // Exclude common file types and non-HTML resources
    const fileExtensionPattern = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg|mp4|mp3|jpg|jpeg|png|gif|svg|css|js|json|xml)$/i;
    if (fileExtensionPattern.test(url))
      return false;


    return true;
  }

  /**
   * Check if URL is already queued
   */
  private isQueued(url: string): boolean {
    return this.visitQueue.some(item => item.url === url);
  }

  /**
   * Get current depth for a URL
   */
  private getCurrentDepth(url: string): number {
    const queueItem = this.visitQueue.find(item => item.url === url);
    return queueItem ? queueItem.depth : this.currentDepth;
  }

  /**
   * Normalize URL relative to base URL
   */
  private normalizeUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  /**
   * Check if we should finish crawling
   */
  private shouldFinish(observation: PlannerObservation): boolean {
    if (this.pagesVisited >= this.config.maxPages)
      return true;


    if (this.visitQueue.length === 0 && observation.clickableElements.length === 0)
      return true;


    return false;
  }

  /**
   * Get reason for finishing
   */
  private getFinishReason(): string {
    if (this.pagesVisited >= this.config.maxPages)
      return `Reached maximum page limit (${this.config.maxPages})`;


    if (this.visitQueue.length === 0)
      return 'No more URLs to visit in the queue';


    return 'Crawling complete';
  }

  /**
   * Get crawling statistics
   */
  getStats() {
    return {
      pagesVisited: this.pagesVisited,
      queueSize: this.visitQueue.length,
      visitedUrls: Array.from(this.visited),
      currentDepth: this.currentDepth,
      maxDepth: this.config.maxDepth,
      maxPages: this.config.maxPages
    };
  }
}
