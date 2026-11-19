#!/usr/bin/env node
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
 * Opens VS Code marketplace publisher page using Darbot Browser MCP.
 * Usage: node utils/open-marketplace.js
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function openMarketplace() {
  console.log('Opening VS Code marketplace with Darbot Browser MCP...');
  console.log('[INFO] This will use your existing browser via bridge if available,');
  console.log('[INFO] otherwise launches a fresh Edge session (login required).\n');
  
  const client = new Client({ name: 'marketplace-opener', version: '1.3.0' });
  
  try {
    // Connect to local CLI - will auto-detect bridge if running
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['cli.js', '--browser', 'msedge'],
      cwd: process.cwd(),
    });
    
    await client.connect(transport);
    console.log('[OK] Connected to Darbot Browser MCP');
    
    // Navigate to the marketplace
    console.log('[...] Navigating to VS Code marketplace publisher page...');
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://marketplace.visualstudio.com/manage/publishers/darbotlabs' }
    });
    
    console.log('[OK] Marketplace opened successfully!');
    console.log('[INFO] The browser will remain open for you to interact');
    console.log('[INFO] Press Ctrl+C to close when done.');
    
    // Handle cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\n[...] Closing browser session...');
      try {
        await client.callTool({ name: 'browser_close' });
      } catch (e) {
        // Ignore errors during cleanup
      }
      await client.close();
      console.log('[OK] Session closed');
      process.exit(0);
    });
    
    // Keep alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('[FAILED] Failed to open marketplace:', error.message);
    process.exit(1);
  }
}

openMarketplace().catch(console.error);
