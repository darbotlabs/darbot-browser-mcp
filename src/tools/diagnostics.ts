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

import { z } from 'zod';
import { defineTool } from './tool.js';

/**
 * Enhanced console with filtering - builds on existing console tool
 */
const consoleFiltered = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_console_filtered',
    title: 'Autonomous filtered console',
    description: 'Autonomously retrieve console messages filtered by type (log, error, warning, info, debug). Useful for focused debugging.',
    inputSchema: z.object({
      type: z.enum(['log', 'error', 'warning', 'info', 'debug', 'all']).optional().default('all').describe('Type of console messages to retrieve'),
      limit: z.number().optional().default(100).describe('Maximum number of messages to return'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const messages = tab.consoleMessages();
    
    let filtered = messages;
    if (params.type && params.type !== 'all') {
      filtered = messages.filter(msg => msg.type === params.type);
    }
    
    // Apply limit
    filtered = filtered.slice(-params.limit!);
    
    const log = filtered.length > 0
      ? filtered.map(msg => `[${(msg.type || 'unknown').toUpperCase()}] ${msg.text}`).join('\n')
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
 * Performance metrics tool - get performance timing information
 */
const performanceMetrics = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_performance_metrics',
    title: 'Autonomous performance analysis',
    description: 'Autonomously retrieve performance metrics including page load times, DOM content loaded, and other timing data.',
    inputSchema: z.object({}),
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
        'Core Timings:',
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
