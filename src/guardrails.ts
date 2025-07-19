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
import type { CrawlAction } from './planner.js';

const log = debug('darbot:guardrails');

export interface GuardrailConfig {
  maxPagesPerDomain: number;
  maxDepth: number;
  timeoutMs: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  blockedPatterns?: RegExp[];
  rateLimit: {
    requestsPerSecond: number;
    burstSize: number;
  };
  safetyChecks: {
    preventInfiniteLoops: boolean;
    preventDestructiveActions: boolean;
    requireUserConfirmation: boolean;
  };
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  modified?: CrawlAction;
}

export interface ActionContext {
  currentUrl: string;
  visitedUrls: string[];
  currentDepth: number;
  sessionStartTime: number;
  lastActionTime: number;
}

/**
 * Guardrail system for safe autonomous operation
 */
export class GuardrailSystem {
  private readonly config: GuardrailConfig;
  private readonly domainCounts: Map<string, number> = new Map();
  private readonly actionHistory: Array<{ action: CrawlAction; timestamp: number; url: string }> = [];
  private readonly rateLimiter: RateLimiter;

  constructor(config: Partial<GuardrailConfig> = {}) {
    this.config = {
      maxPagesPerDomain: 50,
      maxDepth: 5,
      timeoutMs: 300000, // 5 minutes
      allowedDomains: [],
      blockedDomains: [
        'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
        'tiktok.com', 'youtube.com', 'gmail.com', 'outlook.com'
      ],
      blockedPatterns: [
        /\/login\/?$/i,
        /\/register\/?$/i,
        /\/signup\/?$/i,
        /\/logout\/?$/i,
        /\/admin\/?/i,
        /\/api\//i,
        /\.exe$/i,
        /\.dmg$/i,
        /\.zip$/i,
        /malware/i,
        /virus/i,
        /hack/i,
        /illegal/i
      ],
      rateLimit: {
        requestsPerSecond: 2,
        burstSize: 5
      },
      safetyChecks: {
        preventInfiniteLoops: true,
        preventDestructiveActions: true,
        requireUserConfirmation: false
      },
      ...config
    };

    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.requestsPerSecond,
      this.config.rateLimit.burstSize
    );
  }

  /**
   * Validate a crawl action before execution
   */
  async validateAction(action: CrawlAction, context: ActionContext): Promise<ValidationResult> {
    log('Validating action:', action.type, action.target || action.url);

    // Check rate limiting
    if (!this.rateLimiter.allowRequest()) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded. Please slow down requests.'
      };
    }

    // Check timeout
    if (this.isSessionTimedOut(context.sessionStartTime)) {
      return {
        allowed: false,
        reason: `Session timeout exceeded (${this.config.timeoutMs}ms)`
      };
    }

    // Check depth limit
    if (context.currentDepth > this.config.maxDepth) {
      return {
        allowed: false,
        reason: `Maximum crawl depth exceeded (${this.config.maxDepth})`
      };
    }

    // Validate specific action types
    switch (action.type) {
      case 'navigate':
        return this.validateNavigation(action, context);
      case 'click':
        return this.validateClick(action, context);
      case 'type':
        return this.validateType(action, context);
      case 'finish':
        return { allowed: true };
      default:
        return { allowed: true };
    }
  }

  /**
   * Validate navigation actions
   */
  private validateNavigation(action: CrawlAction, context: ActionContext): ValidationResult {
    if (!action.url) {
      return { allowed: false, reason: 'Navigation action missing URL' };
    }

    // URL safety checks
    const urlCheck = this.validateUrl(action.url);
    if (!urlCheck.allowed) {
      return urlCheck;
    }

    // Domain count check
    const domain = this.extractDomain(action.url);
    const domainCount = this.domainCounts.get(domain) || 0;
    
    if (domainCount >= this.config.maxPagesPerDomain) {
      return {
        allowed: false,
        reason: `Maximum pages per domain exceeded for ${domain} (${this.config.maxPagesPerDomain})`
      };
    }

    // Infinite loop prevention
    if (this.config.safetyChecks.preventInfiniteLoops) {
      const loopCheck = this.detectInfiniteLoop(action, context);
      if (!loopCheck.allowed) {
        return loopCheck;
      }
    }

    // Update domain count
    this.domainCounts.set(domain, domainCount + 1);

    return { allowed: true };
  }

  /**
   * Validate click actions
   */
  private validateClick(action: CrawlAction, context: ActionContext): ValidationResult {
    if (!action.target) {
      return { allowed: false, reason: 'Click action missing target selector' };
    }

    // Check for potentially destructive actions
    if (this.config.safetyChecks.preventDestructiveActions) {
      const destructiveCheck = this.checkDestructiveClick(action);
      if (!destructiveCheck.allowed) {
        return destructiveCheck;
      }
    }

    return { allowed: true };
  }

  /**
   * Validate type actions
   */
  private validateType(action: CrawlAction, context: ActionContext): ValidationResult {
    if (!action.text) {
      return { allowed: false, reason: 'Type action missing text' };
    }

    // Prevent sensitive data input
    const sensitivePatterns = [
      /password/i,
      /ssn/i,
      /social.security/i,
      /credit.card/i,
      /bank.account/i,
      /api.key/i,
      /secret/i,
      /token/i
    ];

    const containsSensitive = sensitivePatterns.some(pattern => 
      pattern.test(action.text!) || pattern.test(action.target || '')
    );

    if (containsSensitive) {
      return {
        allowed: false,
        reason: 'Type action appears to contain sensitive information'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate URL safety
   */
  private validateUrl(url: string): ValidationResult {
    try {
      const urlObj = new URL(url);

      // Protocol check
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          allowed: false,
          reason: `Unsafe protocol: ${urlObj.protocol}`
        };
      }

      // Domain whitelist check
      if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
        const isAllowed = this.config.allowedDomains.some(domain =>
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
        
        if (!isAllowed) {
          return {
            allowed: false,
            reason: `Domain not in allowlist: ${urlObj.hostname}`
          };
        }
      }

      // Domain blocklist check
      if (this.config.blockedDomains) {
        const isBlocked = this.config.blockedDomains.some(domain =>
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
        
        if (isBlocked) {
          return {
            allowed: false,
            reason: `Domain is blocked: ${urlObj.hostname}`
          };
        }
      }

      // Pattern check
      if (this.config.blockedPatterns) {
        const matchedPattern = this.config.blockedPatterns.find(pattern => pattern.test(url));
        if (matchedPattern) {
          return {
            allowed: false,
            reason: `URL matches blocked pattern: ${matchedPattern.source}`
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      return {
        allowed: false,
        reason: `Invalid URL: ${error}`
      };
    }
  }

  /**
   * Detect infinite loop patterns
   */
  private detectInfiniteLoop(action: CrawlAction, context: ActionContext): ValidationResult {
    if (action.type !== 'navigate' || !action.url) {
      return { allowed: true };
    }

    // Check if we've visited this URL recently
    const recentActions = this.actionHistory
      .filter(h => Date.now() - h.timestamp < 60000) // Last minute
      .filter(h => h.action.type === 'navigate' && h.action.url === action.url);

    if (recentActions.length >= 3) {
      return {
        allowed: false,
        reason: `Potential infinite loop detected: visited ${action.url} ${recentActions.length} times in the last minute`
      };
    }

    // Check for back-and-forth patterns
    const lastFewActions = this.actionHistory.slice(-6)
      .filter(h => h.action.type === 'navigate')
      .map(h => h.action.url);

    if (lastFewActions.length >= 4) {
      const pattern = [lastFewActions[0], lastFewActions[1]];
      let patternCount = 0;
      
      for (let i = 0; i < lastFewActions.length - 1; i += 2) {
        if (lastFewActions[i] === pattern[0] && lastFewActions[i + 1] === pattern[1]) {
          patternCount++;
        }
      }
      
      if (patternCount >= 2) {
        return {
          allowed: false,
          reason: 'Infinite navigation loop detected between two URLs'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check for potentially destructive click actions
   */
  private checkDestructiveClick(action: CrawlAction): ValidationResult {
    if (!action.target) {
      return { allowed: true };
    }

    const destructivePatterns = [
      /delete/i,
      /remove/i,
      /cancel/i,
      /logout/i,
      /sign.?out/i,
      /unsubscribe/i,
      /deactivate/i,
      /close.account/i,
      /purchase/i,
      /buy.now/i,
      /order.now/i,
      /submit.payment/i
    ];

    const isDestructive = destructivePatterns.some(pattern =>
      pattern.test(action.target!) || pattern.test(action.reason || '')
    );

    if (isDestructive) {
      return {
        allowed: false,
        reason: 'Click action appears to be potentially destructive'
      };
    }

    return { allowed: true };
  }

  /**
   * Record an action in history
   */
  recordAction(action: CrawlAction, url: string): void {
    this.actionHistory.push({
      action,
      timestamp: Date.now(),
      url
    });

    // Keep only recent history
    const cutoff = Date.now() - 3600000; // 1 hour
    while (this.actionHistory.length > 0 && this.actionHistory[0].timestamp < cutoff) {
      this.actionHistory.shift();
    }
  }

  /**
   * Check if session has timed out
   */
  private isSessionTimedOut(sessionStartTime: number): boolean {
    return Date.now() - sessionStartTime > this.config.timeoutMs;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  /**
   * Get guardrail statistics
   */
  getStats() {
    return {
      domainCounts: Object.fromEntries(this.domainCounts),
      actionsRecorded: this.actionHistory.length,
      rateLimiterStatus: this.rateLimiter.getStatus(),
      config: this.config
    };
  }

  /**
   * Reset guardrail state
   */
  reset(): void {
    this.domainCounts.clear();
    this.actionHistory.length = 0;
    this.rateLimiter.reset();
  }
}

/**
 * Simple rate limiter implementation
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(tokensPerSecond: number, burstSize: number) {
    this.maxTokens = burstSize;
    this.refillRate = tokensPerSecond;
    this.tokens = burstSize;
    this.lastRefill = Date.now();
  }

  allowRequest(): boolean {
    this.refillTokens();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getStatus() {
    this.refillTokens();
    return {
      tokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate
    };
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}