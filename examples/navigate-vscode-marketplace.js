#!/usr/bin/env node
/**
 * Darbot Browser MCP - Navigate to VS Code Marketplace Extension
 * 
 * Opens the Darbot Browser MCP extension page on VS Code Marketplace.
 * 
 * Usage: node navigate-vscode-marketplace.js
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function main() {
  const client = new Client({ name: 'darbot-marketplace', version: '1.3.0' });
  
  // Connect to Darbot Browser MCP
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@darbotlabs/darbot-browser-mcp@latest', '--browser', 'msedge'],
  });
  
  await client.connect(transport);
  console.log('Connected');
  
  // Navigate to VS Code Marketplace
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp' }
  });
  console.log('Opened VS Code Marketplace extension page');
  
  // Take a screenshot
  await client.callTool({
    name: 'browser_take_screenshot',
    arguments: {}
  });
  console.log('Screenshot taken');
  
  // Cleanup
  await client.callTool({ name: 'browser_close' });
  await client.close();
  console.log('Done');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
