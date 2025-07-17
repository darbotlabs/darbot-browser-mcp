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
 * AI-native context management for enhanced session tracking and intelligent automation
 */

export interface PageState {
  url: string;
  title: string;
  timestamp: number;
  elements: string[];
  userActions: ActionHistory[];
}

export interface ActionHistory {
  action: string;
  target?: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface UserGoal {
  description: string;
  completed: boolean;
  progress: number; // 0-1
  subTasks: string[];
}

export interface SessionContext {
  currentTask: string;
  pageIntent: string;
  userGoals: UserGoal[];
  navigationHistory: PageState[];
  failurePatterns: ErrorPattern[];
  successfulActions: ActionHistory[];
  contextId: string;
  startTime: number;
  lastActivity: number;
}

export interface ErrorPattern {
  errorType: string;
  elementSelector?: string;
  pageUrl?: string;
  frequency: number;
  lastOccurrence: number;
  recoveryActions: string[];
}

/**
 * AI-native context manager for tracking user intent and session state
 */
export class AIContextManager {
  private contexts = new Map<string, SessionContext>();
  private readonly maxHistorySize = 50;

  /**
   * Create or get session context for a browser session
   */
  getOrCreateContext(sessionId: string): SessionContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        currentTask: '',
        pageIntent: '',
        userGoals: [],
        navigationHistory: [],
        failurePatterns: [],
        successfulActions: [],
        contextId: sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
      });
    }
    return this.contexts.get(sessionId)!;
  }

  /**
   * Update current task description
   */
  updateTask(sessionId: string, task: string): void {
    const context = this.getOrCreateContext(sessionId);
    context.currentTask = task;
    context.lastActivity = Date.now();
  }

  /**
   * Set page intent based on analysis
   */
  setPageIntent(sessionId: string, intent: string): void {
    const context = this.getOrCreateContext(sessionId);
    context.pageIntent = intent;
    context.lastActivity = Date.now();
  }

  /**
   * Record successful action for learning
   */
  recordSuccess(sessionId: string, action: ActionHistory): void {
    const context = this.getOrCreateContext(sessionId);
    context.successfulActions.push(action);
    context.lastActivity = Date.now();

    // Keep only recent successes
    if (context.successfulActions.length > this.maxHistorySize)
      context.successfulActions = context.successfulActions.slice(-this.maxHistorySize);

  }

  /**
   * Record page state for navigation tracking
   */
  recordPageState(sessionId: string, pageState: PageState): void {
    const context = this.getOrCreateContext(sessionId);
    context.navigationHistory.push(pageState);
    context.lastActivity = Date.now();

    // Keep only recent navigation history
    if (context.navigationHistory.length > this.maxHistorySize)
      context.navigationHistory = context.navigationHistory.slice(-this.maxHistorySize);

  }

  /**
   * Record error pattern for learning
   */
  recordError(sessionId: string, error: ErrorPattern): void {
    const context = this.getOrCreateContext(sessionId);

    // Find existing pattern or create new
    const existing = context.failurePatterns.find(p =>
      p.errorType === error.errorType &&
      p.elementSelector === error.elementSelector &&
      p.pageUrl === error.pageUrl
    );

    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = Date.now();
    } else {
      context.failurePatterns.push({
        ...error,
        frequency: 1,
        lastOccurrence: Date.now(),
      });
    }

    context.lastActivity = Date.now();
  }

  /**
   * Get context for AI decision making
   */
  getContext(sessionId: string): SessionContext {
    return this.getOrCreateContext(sessionId);
  }

  /**
   * Analyze patterns to suggest next actions
   */
  suggestNextActions(sessionId: string, currentPage: string): string[] {
    const context = this.getOrCreateContext(sessionId);
    const suggestions: string[] = [];

    // Analyze successful patterns
    const recentSuccesses = context.successfulActions
        .filter(action => Date.now() - action.timestamp < 300000) // Last 5 minutes
        .slice(-10);

    // Look for common action patterns
    const actionCounts = new Map<string, number>();
    recentSuccesses.forEach(action => {
      actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
    });

    // Suggest most common recent actions
    const sortedActions = Array.from(actionCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    sortedActions.forEach(([action]) => {
      suggestions.push(`Continue with ${action} action based on recent pattern`);
    });

    return suggestions;
  }

  /**
   * Clean up old contexts
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, context] of this.contexts.entries()) {
      if (now - context.lastActivity > maxAge)
        this.contexts.delete(sessionId);

    }
  }

  /**
   * Clear context for session
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }
}

// Global instance for session management
export const aiContextManager = new AIContextManager();
