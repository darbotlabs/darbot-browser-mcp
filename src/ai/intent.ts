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
 * AI-native intent parsing for natural language browser automation commands
 */

export interface ParsedIntent {
  action: string;
  target?: string;
  parameters: Record<string, any>;
  confidence: number;
  fallbackStrategy?: string;
}

export interface IntentPattern {
  pattern: RegExp;
  action: string;
  parameterExtractors: Record<string, (match: RegExpMatchArray) => any>;
  confidence: number;
}

/**
 * Intent parser for natural language automation commands
 */
export class IntentParser {
  private patterns: IntentPattern[] = [
    // Navigation intents
    {
      pattern: /(?:go to|navigate to|visit|open)\s+(.+)/i,
      action: 'navigate',
      parameterExtractors: {
        url: match => this.normalizeUrl(match[1].trim()),
      },
      confidence: 0.9,
    },

    // Form submission intents
    {
      pattern: /(?:submit|send|complete)\s+(?:the\s+)?form/i,
      action: 'submit_form',
      parameterExtractors: {},
      confidence: 0.85,
    },

    // Click intents
    {
      pattern: /(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button|\s+link)?$/i,
      action: 'click',
      parameterExtractors: {
        element: match => match[1].trim(),
      },
      confidence: 0.8,
    },

    // Text input intents
    {
      pattern: /(?:type|enter|input|fill)\s+['""](.+?)['""]\s+(?:in|into)\s+(?:the\s+)?(.+)/i,
      action: 'type',
      parameterExtractors: {
        text: match => match[1],
        element: match => match[2].trim(),
      },
      confidence: 0.85,
    },

    // Search intents
    {
      pattern: /search\s+for\s+['""]?(.+?)['""]?/i,
      action: 'search',
      parameterExtractors: {
        query: match => match[1].trim(),
      },
      confidence: 0.8,
    },

    // GitHub-specific intents
    {
      pattern: /(?:create|open)\s+(?:a\s+)?(?:new\s+)?(?:github\s+)?issue/i,
      action: 'github_create_issue',
      parameterExtractors: {},
      confidence: 0.9,
    },

    {
      pattern: /(?:review|check)\s+(?:the\s+)?(?:github\s+)?(?:pull\s+)?(?:request|pr)/i,
      action: 'github_review_pr',
      parameterExtractors: {},
      confidence: 0.9,
    },

    // Login intents
    {
      pattern: /(?:log\s*in|sign\s*in|login)\s+(?:to\s+)?(.+)/i,
      action: 'login',
      parameterExtractors: {
        service: match => match[1].trim(),
      },
      confidence: 0.85,
    },

    // Wait intents
    {
      pattern: /wait\s+(?:for\s+)?(?:the\s+)?(.+?)(?:\s+to\s+(?:appear|load|show))?/i,
      action: 'wait_for',
      parameterExtractors: {
        target: match => match[1].trim(),
      },
      confidence: 0.8,
    },

    // Screenshot intents
    {
      pattern: /(?:take|capture)\s+(?:a\s+)?screenshot/i,
      action: 'screenshot',
      parameterExtractors: {},
      confidence: 0.9,
    },
  ];

  /**
   * Parse natural language intent into structured action
   */
  parseIntent(description: string): ParsedIntent {
    const normalizedDescription = description.trim();

    for (const pattern of this.patterns) {
      const match = normalizedDescription.match(pattern.pattern);
      if (match) {
        const parameters: Record<string, any> = {};

        // Extract parameters using pattern extractors
        for (const [key, extractor] of Object.entries(pattern.parameterExtractors)) {
          try {
            parameters[key] = extractor(match);
          } catch (error) {
            // Skip parameter if extraction fails
            continue;
          }
        }

        return {
          action: pattern.action,
          parameters,
          confidence: pattern.confidence,
          fallbackStrategy: this.getFallbackStrategy(pattern.action),
        };
      }
    }

    // Fallback to generic action detection
    return this.parseGenericIntent(normalizedDescription);
  }

  /**
   * Parse generic intents that don't match specific patterns
   */
  private parseGenericIntent(description: string): ParsedIntent {
    const lowercaseDesc = description.toLowerCase();

    // Common action keywords
    if (lowercaseDesc.includes('click') || lowercaseDesc.includes('press')) {
      return {
        action: 'click',
        parameters: { element: description },
        confidence: 0.6,
        fallbackStrategy: 'auto_detect_clickable_elements',
      };
    }

    if (lowercaseDesc.includes('type') || lowercaseDesc.includes('enter')) {
      return {
        action: 'type',
        parameters: { text: description },
        confidence: 0.5,
        fallbackStrategy: 'auto_detect_input_fields',
      };
    }

    if (lowercaseDesc.includes('navigate') || lowercaseDesc.includes('go')) {
      return {
        action: 'navigate',
        parameters: { url: description },
        confidence: 0.5,
        fallbackStrategy: 'search_for_url',
      };
    }

    // Default to generic interaction
    return {
      action: 'interact',
      parameters: { description },
      confidence: 0.3,
      fallbackStrategy: 'analyze_page_context',
    };
  }

  /**
   * Get fallback strategy for action type
   */
  private getFallbackStrategy(action: string): string {
    const strategies: Record<string, string> = {
      'navigate': 'search_for_url',
      'click': 'auto_detect_clickable_elements',
      'type': 'auto_detect_input_fields',
      'submit_form': 'find_submit_buttons',
      'search': 'find_search_input',
      'github_create_issue': 'navigate_to_github_issues',
      'github_review_pr': 'navigate_to_github_prs',
      'login': 'find_login_form',
      'wait_for': 'intelligent_wait',
      'screenshot': 'capture_full_page',
    };

    return strategies[action] || 'analyze_page_context';
  }

  /**
   * Normalize URL for navigation
   */
  private normalizeUrl(url: string): string {
    // Remove quotes and trim
    const cleaned = url.replace(/['"]/g, '').trim();

    // Add protocol if missing
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      // Check if it looks like a domain
      if (cleaned.includes('.') && !cleaned.includes(' '))
        return `https://${cleaned}`;

      // Otherwise treat as search query
      return `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`;
    }

    return cleaned;
  }

  /**
   * Enhance intent with context information
   */
  enhanceWithContext(intent: ParsedIntent, context: any): ParsedIntent {
    // Add context-aware enhancements
    const enhanced = { ...intent };

    // Enhance based on current page context
    if (context.pageIntent)
      enhanced.parameters.pageContext = context.pageIntent;


    // Adjust confidence based on context
    if (context.successfulActions) {
      const similarActions = context.successfulActions.filter(
          (action: any) => action.action === intent.action
      );
      if (similarActions.length > 0)
        enhanced.confidence = Math.min(enhanced.confidence + 0.1, 1.0);

    }

    return enhanced;
  }

  /**
   * Extract workflow intentions from complex descriptions
   */
  parseWorkflowIntent(description: string): ParsedIntent[] {
    // Split complex descriptions into steps
    const stepSeparators = /(?:then|next|after that|and then|,\s*)/i;
    const steps = description.split(stepSeparators).map(s => s.trim()).filter(s => s.length > 0);

    if (steps.length <= 1)
      return [this.parseIntent(description)];


    // Parse each step as individual intent
    return steps.map(step => this.parseIntent(step));
  }
}

// Global intent parser instance
export const intentParser = new IntentParser();
