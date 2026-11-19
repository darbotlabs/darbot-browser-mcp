#!/usr/bin/env node
/**
 * Darbot Browser MCP - Simple Navigation Example
 * 
 * Minimal example showing how to navigate to DarbotLabs GitHub.
 * 
 * Usage: node navigate-darbotlabs.js
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function main() {
  const client = new Client({ name: 'darbot-simple', version: '1.3.0' });
  
  // Connect to Darbot Browser MCP
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@darbotlabs/darbot-browser-mcp@latest', '--browser', 'msedge'],
  });
  
  await client.connect(transport);
  console.log('Connected');
  
  // Navigate to DarbotLabs GitHub
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://github.com/darbotlabs' }
  });
  console.log('Opened https://github.com/darbotlabs');
  
  // Take a screenshot
  const screenshot = await client.callTool({
    name: 'browser_take_screenshot',
    arguments: {}
  });
  console.log('Screenshot taken');
  
  // Get page snapshot
  const snapshot = await client.callTool({
    name: 'browser_snapshot',
    arguments: {}
  });
  console.log('Page snapshot:', snapshot.content?.[0]?.text?.substring(0, 200) + '...');
  
  // Cleanup
  await client.callTool({ name: 'browser_close' });
  await client.close();
  console.log('Done');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
