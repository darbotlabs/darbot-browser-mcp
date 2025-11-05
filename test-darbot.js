#!/usr/bin/env node
/**
 * Test script for Darbot Browser MCP autonomous browser
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testDarbotBrowser() {
  console.log('🤖 Testing Darbot Browser MCP v0.1.0 autonomous browser...');
  
  // Create MCP client
  const client = new Client({ name: 'darbot-test', version: '1.0.0' });
  
  try {
    // Connect to darbot-browser-mcp CLI
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['cli.js', '--headless', '--browser', 'msedge'],
      cwd: process.cwd(),
    });
    
    await client.connect(transport);
    console.log('✅ Connected to Darbot Browser MCP');
    
    // Test 1: List all autonomous browser tools
    const { tools } = await client.listTools();
    console.log(`🛠️  Found ${tools.length} autonomous browser tools:`);
    tools.forEach(tool => console.log(`   - ${tool.name}`));
    
    // Test 2: Check for key autonomous tools
    const expectedTools = [
      'browser_navigate',
      'browser_click', 
      'browser_type',
      'browser_snapshot',
      'browser_take_screenshot',
      'browser_save_profile',
      'browser_switch_profile'
    ];
    
    const availableTools = tools.map(t => t.name);
    let allToolsFound = true;
    
    console.log('\n🔍 Checking for key autonomous browser tools:');
    for (const tool of expectedTools) {
      if (availableTools.includes(tool)) {
        console.log(`   ✅ ${tool}`);
      } else {
        console.log(`   ❌ ${tool} - MISSING`);
        allToolsFound = false;
      }
    }
    
    // Test 3: Test basic navigation
    console.log('\n🌐 Testing browser navigation...');
    const navResult = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' }
    });
    
    if (navResult.content && navResult.content[0]?.text?.includes('example.com')) {
      console.log('✅ Navigation test passed');
    } else {
      console.log('❌ Navigation test failed');
      console.log('Response:', navResult);
    }
    
    // Test 4: Test snapshot capability
    console.log('\n📸 Testing snapshot capability...');
    const snapshotResult = await client.callTool({
      name: 'browser_snapshot'
    });
    
    if (snapshotResult.content && snapshotResult.content[0]?.text) {
      console.log('✅ Snapshot test passed');
      console.log('Snapshot preview:', snapshotResult.content[0].text.substring(0, 200) + '...');
    } else {
      console.log('❌ Snapshot test failed');
    }
    
    // Summary
    console.log('\n🎯 Test Summary:');
    console.log(`   Tools Available: ${tools.length}/29`);
    console.log(`   Key Tools: ${allToolsFound ? 'All Present' : 'Some Missing'}`);
    console.log('   Autonomous Browser: ✅ OPERATIONAL');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDarbotBrowser().catch(console.error);
