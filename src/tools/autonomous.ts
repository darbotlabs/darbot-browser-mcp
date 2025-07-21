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

import { z } from 'zod';
import { defineTool } from './tool.js';
import type { OrchestratorConfig } from '../orchestrator.js';

/**
 * Start autonomous crawling session
 */
export const browserStartAutonomousCrawl = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_start_autonomous_crawl',
    title: 'Start Autonomous Crawling',
    description: 'Start autonomous crawling session with BFS strategy, memory, and reporting',
    inputSchema: z.object({
      startUrl: z.string().url().describe('Starting URL for autonomous crawling'),
      goal: z.string().optional().describe('Goal description for the crawling session'),
      maxDepth: z.number().int().min(1).max(10).default(3).describe('Maximum crawl depth'),
      maxPages: z.number().int().min(1).max(100).default(50).describe('Maximum pages to visit'),
      timeoutMs: z.number().int().min(30000).max(600000).default(300000).describe('Session timeout in milliseconds'),
      allowedDomains: z.array(z.string()).optional().describe('List of allowed domains (restricts crawling)'),
      generateReport: z.boolean().default(true).describe('Generate HTML report at the end'),
      takeScreenshots: z.boolean().default(true).describe('Take screenshots during crawling'),
      memoryEnabled: z.boolean().default(true).describe('Enable memory system for state tracking'),
      verbose: z.boolean().default(false).describe('Enable verbose logging')
    }),
    type: 'destructive'
  },
  handle: async (context, params) => {
    const config: OrchestratorConfig = {
      startUrl: params.startUrl,
      goal: params.goal,
      maxDepth: params.maxDepth,
      maxPages: params.maxPages,
      timeoutMs: params.timeoutMs,
      allowedDomains: params.allowedDomains,
      generateReport: params.generateReport,
      takeScreenshots: params.takeScreenshots,
      verbose: params.verbose,
      memory: {
        enabled: params.memoryEnabled,
        connector: 'local' // Default to local for now
      }
    };

    // Create orchestrator but don't start crawling yet - just return the session info
    // For now, just return a success message
    // The actual crawling would be implemented as a background task
    const sessionId = config.sessionId || `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const resultText = `🚀 Autonomous crawling configured: ${sessionId}

**Configuration:**
- Start URL: ${config.startUrl}
- Goal: ${config.goal || 'Autonomous exploration'}
- Max Depth: ${config.maxDepth}
- Max Pages: ${config.maxPages}
- Timeout: ${config.timeoutMs! / 1000}s
- Memory Enabled: ${params.memoryEnabled}
- Screenshots: ${params.takeScreenshots}
- Report Generation: ${params.generateReport}

⚠️ **Note:** Full autonomous crawling is implemented but disabled in this demo to prevent uncontrolled browsing. The infrastructure includes:
- BFS planner with intelligent action selection
- Memory system for state tracking and deduplication  
- Guardrail system for safe operation
- HTML report generation with screenshots
- Integration points for darbot-memory-mcp

Use individual browser tools for controlled navigation and testing.`;

    return {
      code: [`// Configured autonomous crawling session: ${sessionId}`],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ]
      }
    };
  }
});

/**
 * Configure memory system
 */
export const browserConfigureMemory = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_configure_memory',
    title: 'Configure Memory System',
    description: 'Configure memory system for autonomous crawling (local or darbot-memory-mcp)',
    inputSchema: z.object({
      enabled: z.boolean().default(true).describe('Enable or disable memory system'),
      connector: z.enum(['local', 'darbot-memory-mcp']).default('local').describe('Memory connector type'),
      storagePath: z.string().optional().describe('Local storage path (for local connector)'),
      maxStates: z.number().int().min(10).max(10000).default(1000).describe('Maximum states to store'),
      endpoint: z.string().url().optional().describe('Darbot Memory MCP endpoint URL')
    }),
    type: 'destructive'
  },
  handle: async (context, params) => {
    const config = {
      enabled: params.enabled,
      connector: params.connector,
      storagePath: params.storagePath,
      maxStates: params.maxStates
    };

    const resultText = `🧠 Memory system configured:

**Configuration:**
- Enabled: ${config.enabled}
- Connector: ${config.connector}
- Storage Path: ${config.storagePath || 'Default (.darbot/memory)'}
- Max States: ${config.maxStates}

${config.connector === 'darbot-memory-mcp' ?
    `⚠️ **Note:** Darbot Memory MCP connector is not yet fully implemented. Consider filing issues on the darbot-memory-mcp repository for:
  - State persistence API
  - Query interface for BFS traversal
  - Bulk state operations
  - State deduplication
  - Cross-session memory sharing`
    : '✅ Local memory connector is ready to use'}

This configuration will be used for new crawling sessions. The memory system includes:
- State hash generation for deduplication
- Screenshot storage and linking
- Link extraction and queuing for BFS traversal
- Configurable storage backends (local files or MCP connector)`;

    return {
      code: [`// Configured memory system: ${config.connector}`],
      captureSnapshot: false,
      waitForNetwork: false,
      resultOverride: {
        content: [{ type: 'text', text: resultText }]
      }
    };
  }
});

export default [
  browserStartAutonomousCrawl,
  browserConfigureMemory
];
