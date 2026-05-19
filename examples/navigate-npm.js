#!/usr/bin/env node
// @ts-check
/**
 * Demonstrates opening the Darbot Browser MCP npm package page.
 * Run from the repository root:
 *   node examples/navigate-npm.js [url]
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DEFAULT_URL = 'https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp';

async function main() {
  const url = process.argv[2] ?? DEFAULT_URL;
  const client = new Client({ name: 'darbot-navigate-npm', version: '2.0.0' });
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@darbotlabs/darbot-browser-mcp@latest', '--browser', 'msedge'],
  });

  try {
    await client.connect(transport);
    await client.callTool({ name: 'browser_navigate', arguments: { url } });
    const snapshot = await client.callTool({ name: 'browser_snapshot', arguments: {} });
    const text = snapshot.content?.find((item) => item.type === 'text')?.text ?? '';
    console.log(text.slice(0, 500));
  } finally {
    try { await client.callTool({ name: 'browser_close', arguments: {} }); } catch {}
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
