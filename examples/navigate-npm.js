#!/usr/bin/env node
/**
 * Darbot Browser MCP - Navigate to NPM Package
 * 
 * Opens the Darbot Browser MCP package page on NPM.
 * 
 * Usage: node navigate-npm.js
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function main() {
  const client = new Client({ name: 'darbot-npm', version: '1.3.0' });
  
  // Connect to Darbot Browser MCP
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@darbotlabs/darbot-browser-mcp@latest', '--browser', 'msedge'],
  });
  
  await client.connect(transport);
  console.log('Connected');
  
  // Navigate to NPM package page
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp' }
  });
  console.log('Opened NPM package page');
  
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
