#!/usr/bin/env node
/**
 * Simple marketplace opener with error handling
 */

import { spawn } from 'child_process';

async function openMarketplace() {
  console.log('🚀 Opening VS Code marketplace with Darbot Browser MCP...');
  
  try {
    // Start the browser directly with the published package
    const browserProcess = spawn('npx', [
      '@darbotlabs/darbot-browser-mcp@latest',
      '--browser',
      'msedge',
      '--port',
      '8932'
    ], {
      stdio: 'inherit',
      shell: true
    });

    // Handle process events
    browserProcess.on('error', (error) => {
      console.error('❌ Failed to start browser:', error.message);
    });

    browserProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`⚠️  Browser process exited with code ${code}`);
      } else {
        console.log('✅ Browser session ended');
      }
    });

    // Give the server a moment to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Browser MCP server started');
    console.log('🌐 You can now navigate to: https://marketplace.visualstudio.com/manage/publishers/darbotlabs');
    console.log('📦 Upload file: vscode-extension/darbot-browser-mcp-1.2.0.vsix');
    console.log('\n⏳ Press Ctrl+C to close the browser session');

    // Keep the script alive
    process.on('SIGINT', () => {
      console.log('\n🔄 Closing browser session...');
      browserProcess.kill();
      process.exit(0);
    });

    // Wait for the browser process to complete
    await new Promise((resolve) => {
      browserProcess.on('close', resolve);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

openMarketplace().catch(console.error);
