#!/usr/bin/env node
// @ts-check

const DEFAULT_PACKAGE = '@darbotlabs/darbot-browser-mcp@2.1.4';

function usage() {
  console.log(`Usage: node utils/generate-links.js [options]

Generates VS Code MCP install links for Darbot Browser MCP.

Options:
  --name <name>       MCP server name. Default: darbot-browser
  --package <spec>    npm package spec. Default: ${DEFAULT_PACKAGE}
  --raw               Print only the redirect URL.
  --dry-run           Print the JSON config without generating links.
  -h, --help          Show this help.`);
}

const args = process.argv.slice(2);
let name = 'darbot-browser';
let packageSpec = DEFAULT_PACKAGE;
let raw = false;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--name':
      name = args[++i] ?? '';
      break;
    case '--package':
      packageSpec = args[++i] ?? '';
      break;
    case '--raw':
      raw = true;
      break;
    case '--dry-run':
      dryRun = true;
      break;
    case '-h':
    case '--help':
      usage();
      process.exit(0);
    default:
      console.error(`Unknown option: ${args[i]}`);
      usage();
      process.exit(2);
  }
}

if (!name || !packageSpec) {
  console.error('--name and --package must be non-empty.');
  process.exit(2);
}

const config = { name, command: 'npx', args: [packageSpec] };
if (dryRun) {
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

const vscodeUrl = `vscode:mcp/install?${encodeURIComponent(JSON.stringify(config))}`;
const redirectUrl = `https://insiders.vscode.dev/redirect?url=${encodeURIComponent(vscodeUrl)}`;
if (raw) {
  console.log(redirectUrl);
} else {
  console.log('VS Code MCP install URL:');
  console.log(redirectUrl);
  console.log('\nDirect vscode: URL:');
  console.log(vscodeUrl);
}
