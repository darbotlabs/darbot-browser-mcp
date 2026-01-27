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
 * ML-based scoring system for intelligent URL and element prioritization
 *
 * This replaces basic heuristics with feature-based scoring that learns from
 * crawl patterns and goal descriptions to make better decisions.
 */

import debug from 'debug';

const log = debug('darbot:ml-scorer');

export interface ScoringFeatures {
  // URL features
  urlDepth: number;
  urlLength: number;
  hasNumbers: boolean;
  hasHyphens: boolean;
  pathSegments: number;
  queryParams: number;

  // Content features
  textLength: number;
  hasKeywords: boolean;
  semanticRelevance: number;

  // Context features
  parentScore: number;
  visitedSiblings: number;
  domDepth: number;
}

export interface ScoringContext {
  goal?: string;
  visitedUrls: Set<string>;
  successfulUrls: Set<string>;
  parentUrl?: string;
  currentDepth: number;
}

/**
 * ML-inspired scoring system using feature engineering and weighted scoring
 */
export class MLBasedScorer {
  private readonly weights: Map<string, number>;
  private readonly goalKeywords: Set<string>;
  private readonly learnedPatterns: Map<string, number> = new Map();

  constructor(goal?: string) {
    // Initialize feature weights (these could be learned from data)
    this.weights = new Map([
      // URL structure weights
      ['urlDepth', -0.3],           // Prefer shallower URLs
      ['urlLength', -0.1],          // Prefer shorter URLs
      ['pathSegments', 0.2],        // More segments = more specific
      ['queryParams', -0.2],        // Too many params = dynamic/session pages

      // Content weights
      ['textLength', 0.3],          // More text = more content
      ['hasKeywords', 2.0],         // Strong signal for goal relevance
      ['semanticRelevance', 1.5],   // Goal-based relevance

      // Context weights
      ['parentScore', 0.4],         // Good parents suggest good children
      ['visitedSiblings', -0.2],    // Avoid repetitive sibling pages
      ['domDepth', -0.1],           // Prefer more accessible elements

      // Pattern weights
      ['contentPattern', 1.0],      // Content pages
      ['navPattern', 0.5],          // Navigation pages
      ['utilityPattern', -0.5],     // Utility pages (login, etc.)
    ]);

    // Extract keywords from goal
    this.goalKeywords = new Set();
    if (goal) {
      const words = goal.toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 3)
          .filter(w => !this.isStopWord(w));
      words.forEach(w => this.goalKeywords.add(w));
    }

    log('Initialized ML scorer with goal keywords:', Array.from(this.goalKeywords));
  }

  /**
   * Score a URL for crawling priority
   */
  scoreUrl(url: string, context: ScoringContext): number {
    const features = this.extractUrlFeatures(url, context);
    return this.calculateScore(features);
  }

  /**
   * Score an element for interaction priority
   */
  scoreElement(
    element: { text: string; selector: string; tag: string },
    context: ScoringContext
  ): number {
    const features = this.extractElementFeatures(element, context);
    return this.calculateScore(features);
  }

  /**
   * Update learned patterns based on successful crawl
   */
  learn(url: string, success: boolean, features?: ScoringFeatures): void {
    // Extract pattern from URL
    const pattern = this.extractPattern(url);

    // Update pattern score based on success
    const currentScore = this.learnedPatterns.get(pattern) || 0;
    const delta = success ? 0.1 : -0.05;
    this.learnedPatterns.set(pattern, currentScore + delta);

    log('Updated pattern score:', pattern, '->', this.learnedPatterns.get(pattern));
  }

  /**
   * Extract features from URL
   */
  private extractUrlFeatures(url: string, context: ScoringContext): Map<string, number> {
    const features = new Map<string, number>();

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // URL structure features
      features.set('urlDepth', context.currentDepth);
      features.set('urlLength', url.length / 100); // Normalize
      features.set('hasNumbers', /\d/.test(path) ? 1 : 0);
      features.set('hasHyphens', /-/.test(path) ? 1 : 0);
      features.set('pathSegments', path.split('/').filter(Boolean).length);
      features.set('queryParams', urlObj.searchParams.size);

      // Pattern matching
      features.set('contentPattern', this.matchesContentPattern(url) ? 1 : 0);
      features.set('navPattern', this.matchesNavPattern(url) ? 1 : 0);
      features.set('utilityPattern', this.matchesUtilityPattern(url) ? 1 : 0);

      // Goal relevance
      const relevance = this.calculateSemanticRelevance(url);
      features.set('semanticRelevance', relevance);
      features.set('hasKeywords', relevance > 0.5 ? 1 : 0);

      // Context features
      const parentPattern = context.parentUrl ? this.extractPattern(context.parentUrl) : '';
      features.set('parentScore', this.learnedPatterns.get(parentPattern) || 0);

      // Visited sibling counting
      const urlPattern = this.extractPattern(url);
      let visitedSiblings = 0;
      for (const visitedUrl of context.visitedUrls) {
        if (this.extractPattern(visitedUrl) === urlPattern)
          visitedSiblings++;

      }
      features.set('visitedSiblings', visitedSiblings);

    } catch (error) {
      log('Error extracting URL features:', error);
    }

    return features;
  }

  /**
   * Extract features from element
   */
  private extractElementFeatures(
    element: { text: string; selector: string; tag: string },
    context: ScoringContext
  ): Map<string, number> {
    const features = new Map<string, number>();

    const text = element.text.toLowerCase();

    // Text features
    features.set('textLength', Math.min(element.text.length / 50, 1));
    features.set('hasKeywords', this.containsKeywords(text) ? 1 : 0);

    // Semantic relevance
    features.set('semanticRelevance', this.calculateSemanticRelevance(text));

    // DOM features
    const selectorDepth = element.selector.split('>').length;
    features.set('domDepth', selectorDepth);

    // Element type features
    const isActionButton = ['button', 'submit'].includes(element.tag);
    features.set('isActionButton', isActionButton ? 1 : 0);

    // Pattern matching
    features.set('contentPattern', this.matchesContentPattern(text) ? 1 : 0);
    features.set('navPattern', this.matchesNavPattern(text) ? 1 : 0);
    features.set('utilityPattern', this.matchesUtilityPattern(text) ? 1 : 0);

    return features;
  }

  /**
   * Calculate final score from features
   */
  private calculateScore(features: Map<string, number>): number {
    let score = 0;

    for (const [feature, value] of features.entries()) {
      const weight = this.weights.get(feature) || 0;
      score += weight * value;
    }

    // Apply sigmoid to bound score between 0 and 1
    return 1 / (1 + Math.exp(-score));
  }

  /**
   * Calculate semantic relevance to goal
   */
  private calculateSemanticRelevance(text: string): number {
    if (this.goalKeywords.size === 0)
      return 0.5; // Neutral if no goal specified


    const words = text.toLowerCase().split(/\W+/);
    let matches = 0;

    for (const word of words) {
      if (this.goalKeywords.has(word))
        matches++;

    }

    // Normalize by goal keyword count
    return Math.min(matches / this.goalKeywords.size, 1.0);
  }

  /**
   * Check if text contains goal keywords
   */
  private containsKeywords(text: string): boolean {
    if (this.goalKeywords.size === 0)
      return false;


    const words = text.toLowerCase().split(/\W+/);
    return words.some(word => this.goalKeywords.has(word));
  }

  /**
   * Extract pattern from URL
   */
  private extractPattern(url: string): string {
    try {
      const urlObj = new URL(url);
      // Pattern = domain + path structure (without specific IDs/numbers)
      const pathPattern = urlObj.pathname.replace(/\d+/g, '*').replace(/\/[a-f0-9-]{36}/gi, '/*');
      return `${urlObj.hostname}${pathPattern}`;
    } catch {
      return url;
    }
  }

  /**
   * Check if URL/text matches content patterns
   */
  private matchesContentPattern(text: string): boolean {
    const patterns = [
      /article/i, /post/i, /blog/i, /news/i, /story/i,
      /product/i, /item/i, /detail/i, /content/i, /page/i,
      /documentation/i, /docs/i, /guide/i, /tutorial/i
    ];
    return patterns.some(p => p.test(text));
  }

  /**
   * Check if URL/text matches navigation patterns
   */
  private matchesNavPattern(text: string): boolean {
    const patterns = [
      /category/i, /section/i, /menu/i, /nav/i,
      /index/i, /list/i, /archive/i, /browse/i
    ];
    return patterns.some(p => p.test(text));
  }

  /**
   * Check if URL/text matches utility patterns (usually low priority)
   */
  private matchesUtilityPattern(text: string): boolean {
    const patterns = [
      /login/i, /signin/i, /register/i, /signup/i,
      /logout/i, /signout/i, /profile/i, /account/i,
      /terms/i, /privacy/i, /legal/i, /cookie/i,
      /contact/i, /about/i, /help/i, /faq/i
    ];
    return patterns.some(p => p.test(text));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Get learned patterns for debugging/export
   */
  getLearnedPatterns(): Map<string, number> {
    return new Map(this.learnedPatterns);
  }

  /**
   * Export scoring statistics
   */
  getStatistics(): {
    goalKeywords: string[];
    learnedPatterns: number;
    averagePatternScore: number;
    } {
    const scores = Array.from(this.learnedPatterns.values());
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      goalKeywords: Array.from(this.goalKeywords),
      learnedPatterns: this.learnedPatterns.size,
      averagePatternScore: avgScore
    };
  }
}
