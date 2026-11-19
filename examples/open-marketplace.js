#!/usr/bin/env node
/**
 * Darbot Browser MCP - Programmatic Usage Example
 * 
 * This example shows how to use Darbot Browser MCP as a library
 * from a Node.js script using the MCP SDK.
 * 
 * Usage: node open-marketplace.js [url]
 * 
 * Examples:
 *   node open-marketplace.js
 *   node open-marketplace.js https://github.com/darbotlabs
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const DEFAULT_URL = 'https://marketplace.visualstudio.com/manage/publishers/darbotlabs';

async function openBrowser(url = DEFAULT_URL) {
  console.log('Starting Darbot Browser MCP...');
  
  const client = new Client({ name: 'darbot-example', version: '1.3.0' });
  
  try {
    // Connect to the Darbot Browser MCP server via stdio
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@darbotlabs/darbot-browser-mcp@latest', '--browser', 'msedge'],
      cwd: process.cwd(),
    });
    
    await client.connect(transport);
    console.log('Connected to Darbot Browser MCP');
    
    // Navigate to the target URL
    console.log(`Navigating to: ${url}`);
    const result = await client.callTool({
      name: 'browser_navigate',
      arguments: { url }
    });
    
    console.log('Navigation complete!');
    
    // Cleanup
    await client.callTool({ name: 'browser_close' });
    await client.close();
    console.log('Done');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Get URL from command line or use default
const targetUrl = process.argv[2] || DEFAULT_URL;
openBrowser(targetUrl).catch(console.error);
