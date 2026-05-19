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
 * Diagnostics tools: filtered console messages and Navigation Timing metrics.
 *
 * These tools are intentionally `readOnly` — they only query state from the
 * already-active page. Both fail explicitly with `currentTabOrDie()` if no
 * page is open, propagating a clear "no current tab" error to the caller.
 */

import { z } from 'zod';
import { defineTool } from './tool.js';

const consoleFilteredSchema = z.object({
  type: z
      .enum(['log', 'error', 'warning', 'info', 'debug', 'all'])
      .optional()
      .default('all')
      .describe('Console message severity to retrieve. Use "all" to return every message.'),
  limit: z
      .number()
      .int()
      .positive()
      .optional()
      .default(100)
      .describe('Maximum number of messages to return (most recent first). Defaults to 100.'),
});

/**
 * Retrieve console messages from the active page, optionally filtered by
 * severity and capped at a maximum count.
 *
 * @example
 * await browser_console_filtered({ type: 'error', limit: 20 });
 */
const consoleFiltered = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_console_filtered',
    title: 'Autonomous filtered console',
    description: 'Retrieve console messages from the current page, filtered by type (log, error, warning, info, debug) and capped at a maximum count. Returns the most recent messages first.',
    inputSchema: consoleFilteredSchema,
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const messages = tab.consoleMessages();

    const filtered = (params.type && params.type !== 'all')
      ? messages.filter(msg => msg.type === params.type)
      : messages;

    // Keep only the tail so the limit applies to the most recent messages.
    const limited = filtered.slice(-params.limit!);

    const log = limited.length > 0
      ? limited.map(msg => `[${(msg.type || 'unknown').toUpperCase()}] ${msg.text}`).join('\n')
      : `No ${params.type === 'all' ? '' : params.type + ' '}console messages found.`;

    return {
      code: [`// <internal code to get filtered console messages: type=${params.type}, limit=${params.limit}>`],
      action: async () => {
        return {
          content: [{ type: 'text' as const, text: log }]
        };
      },
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Capture Navigation Timing and Performance metrics for the active page.
 *
 * Returns a human-readable breakdown of core load timings, network latency,
 * DOM parsing, and navigation type/redirect count.
 *
 * @example
 * await browser_performance_metrics({});
 */
const performanceMetrics = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_performance_metrics',
    title: 'Autonomous performance analysis',
    description: 'Retrieve performance metrics for the current page including load timings, DOM content loaded, network latency, and navigation type.',
    inputSchema: z.object({}).describe('No input parameters.'),
    type: 'readOnly',
  },

  handle: async context => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Get performance metrics`,
      `const metrics = await page.evaluate(() => JSON.stringify(performance.timing));`,
    ];

    const action = async () => {
      const metrics = await tab.page.evaluate(() => {
        const timing = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        return {
          // Core Web Vitals related
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart,

          // Network timing
          dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcpConnection: timing.connectEnd - timing.connectStart,
          serverResponse: timing.responseEnd - timing.requestStart,

          // Additional metrics
          firstByte: timing.responseStart - timing.navigationStart,
          domParsing: timing.domComplete - timing.domLoading,

          // Navigation type
          navigationType: navigation?.type || 'unknown',
          redirectCount: navigation?.redirectCount || 0,
        };
      });

      const output = [
        '=== Performance Metrics ===',
        '',
        '📊 Core Timings:',
        `  • DOM Content Loaded: ${metrics.domContentLoaded}ms`,
        `  • Load Complete: ${metrics.loadComplete}ms`,
        `  • DOM Interactive: ${metrics.domInteractive}ms`,
        '',
        '🌐 Network Timing:',
        `  • DNS Lookup: ${metrics.dnsLookup}ms`,
        `  • TCP Connection: ${metrics.tcpConnection}ms`,
        `  • Server Response: ${metrics.serverResponse}ms`,
        `  • Time to First Byte: ${metrics.firstByte}ms`,
        '',
        '📄 DOM Parsing:',
        `  • DOM Parsing Time: ${metrics.domParsing}ms`,
        '',
        '🔄 Navigation:',
        `  • Type: ${metrics.navigationType}`,
        `  • Redirect Count: ${metrics.redirectCount}`,
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text: output }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

export default [
  consoleFiltered,
  performanceMetrics,
];
