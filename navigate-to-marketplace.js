#!/usr/bin/env node
/**
 * Navigate to VS Code marketplace using Darbot Browser MCP
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function navigateToMarketplace() {
  console.log('🤖 Using Darbot Browser MCP to navigate to VS Code marketplace...');
  
  const client = new Client({ name: 'marketplace-navigator', version: '1.0.0' });
  
  try {
    // Connect to darbot-browser-mcp (headed mode for interaction)
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['cli.js', '--browser', 'msedge'],
      cwd: process.cwd(),
    });
    
    await client.connect(transport);
    console.log('✅ Connected to Darbot Browser MCP');
    
    // Navigate to VS Code marketplace publisher page
    console.log('🌐 Navigating to VS Code marketplace...');
    const navResult = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://marketplace.visualstudio.com/manage/publishers/darbotlabs' }
    });
    
    console.log('✅ Navigation complete!');
    console.log('🎯 VS Code marketplace publisher page is now open');
    console.log('📦 Ready to upload: vscode-extension/darbot-browser-mcp-1.2.0.vsix');
    
    // Take a screenshot for verification
    console.log('📸 Taking screenshot for verification...');
    const screenshotResult = await client.callTool({
      name: 'browser_take_screenshot',
      arguments: { filename: 'marketplace-publisher-page.png' }
    });
    
    if (screenshotResult.content) {
      console.log('✅ Screenshot saved as marketplace-publisher-page.png');
    }
    
    // Keep the browser open for interaction
    console.log('\n🎯 Marketplace page is ready!');
    console.log('   - Upload the VSIX file: vscode-extension/darbot-browser-mcp-1.2.0.vsix');
    console.log('   - Browser window will remain open for you to interact with');
    console.log('   - Press Ctrl+C when done to close the browser');
    
    // Wait for user to finish
    process.on('SIGINT', async () => {
      console.log('\n👋 Closing browser...');
      try {
        await client.callTool({ name: 'browser_close' });
      } catch (e) {
        // Ignore cleanup errors
      }
      await client.close();
      process.exit(0);
    });
    
    // Keep the process alive to maintain browser session
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Navigation failed:', error.message);
    process.exit(1);
  }
}

navigateToMarketplace().catch(console.error);
