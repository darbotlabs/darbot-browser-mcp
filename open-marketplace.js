#!/usr/bin/env node
/**
 * Simple browser launcher for VS Code marketplace
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function openMarketplace() {
  console.log('🚀 Opening VS Code marketplace with Darbot Browser MCP...');
  
  const client = new Client({ name: 'marketplace-opener', version: '1.0.0' });
  
  try {
    // Connect to the published NPM package directly
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@darbotlabs/darbot-browser-mcp@latest', '--browser', 'msedge'],
      cwd: process.cwd(),
    });
    
    await client.connect(transport);
    console.log('✅ Connected to Darbot Browser MCP');
    
    // Navigate to the marketplace
    console.log('🌐 Navigating to VS Code marketplace publisher page...');
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://marketplace.visualstudio.com/manage/publishers/darbotlabs' }
    });
    
    console.log('✅ Marketplace opened successfully!');
    console.log('📦 Ready to upload: vscode-extension/darbot-browser-mcp-1.2.0.vsix');
    console.log('🎯 The browser will remain open for you to upload the extension');
    
    // Keep process alive to maintain browser session
    console.log('\n⏳ Browser session active. Press Ctrl+C to close when done.');
    
    // Handle cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\n🔄 Closing browser session...');
      try {
        await client.callTool({ name: 'browser_close' });
      } catch (e) {
        // Ignore errors during cleanup
      }
      await client.close();
      console.log('👋 Session closed');
      process.exit(0);
    });
    
    // Keep alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Failed to open marketplace:', error.message);
    process.exit(1);
  }
}

openMarketplace().catch(console.error);
