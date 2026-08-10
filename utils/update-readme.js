#!/usr/bin/env node
/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// @ts-check

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import commonTools from '../lib/tools/common.js';
import consoleTools from '../lib/tools/console.js';
import dialogsTools from '../lib/tools/dialogs.js';
import filesTools from '../lib/tools/files.js';
import installTools from '../lib/tools/install.js';
import keyboardTools from '../lib/tools/keyboard.js';
import navigateTools from '../lib/tools/navigate.js';
import networkTools from '../lib/tools/network.js';
import pdfTools from '../lib/tools/pdf.js';
import * as profilesTools from '../lib/tools/profiles.js';
import snapshotTools from '../lib/tools/snapshot.js';
import tabsTools from '../lib/tools/tabs.js';
import screenshotTools from '../lib/tools/screenshot.js';
import testTools from '../lib/tools/testing.js';
import visionTools from '../lib/tools/vision.js';
import waitTools from '../lib/tools/wait.js';
import { execSync } from 'node:child_process';

let zodToJsonSchema;
try {
  ({ default: zodToJsonSchema } = await import('zod-to-json-schema'));
} catch (error) {
  console.warn('Warning: zod-to-json-schema failed to load; parameter details will be omitted.', error);
}

const categories = {
  'Interactions': [
    ...snapshotTools,
    ...keyboardTools(true),
    ...waitTools(true),
    ...filesTools(true),
    ...dialogsTools(true),
  ],
  'Navigation': [
    ...navigateTools(true),
  ],
  'Resources': [
    ...screenshotTools,
    ...pdfTools,
    ...networkTools,
    ...consoleTools,
  ],
  'Utilities': [
    ...installTools,
    ...commonTools(true),
  ],
  'Tabs': [
    ...tabsTools(true),
  ],
  'Work Profiles': [
    profilesTools.browserSaveProfile,
    profilesTools.browserSwitchProfile,
    profilesTools.browserListProfiles,
    profilesTools.browserDeleteProfile,
    profilesTools.browserExportSessionState,
    profilesTools.browserImportSessionState,
    profilesTools.browserImportWorkspaceMetadata,
    profilesTools.browserDiscoverProfiles,
  ],
  'Testing': [
    ...testTools,
  ],
  'Coordinate-based screen tools': [
    ...visionTools,
    ...keyboardTools(),
    ...waitTools(false),
    ...filesTools(false),
    ...dialogsTools(false),
  ],
};

// NOTE: Can be removed when we drop Node.js 23 support and changed to import.meta.filename.
const __filename = url.fileURLToPath(import.meta.url);

/**
 * @param {import('../src/tools/tool.js').ToolSchema<any>} tool 
 * @returns {string[]}
 */
function formatToolForReadme(tool) {
  const lines = /** @type {string[]} */ ([]);
  lines.push(`<!-- NOTE: This has been generated via ${path.basename(__filename)} -->`);
  lines.push(``);
  lines.push(`- **${tool.name}**`);
  lines.push(`  - Title: ${tool.title}`);
  lines.push(`  - Description: ${tool.description}`);

  if (zodToJsonSchema) {
    const inputSchema = /** @type {any} */ (zodToJsonSchema(tool.inputSchema || {}));
    const requiredParams = inputSchema.required || [];
    if (inputSchema.properties && Object.keys(inputSchema.properties).length) {
      lines.push(`  - Parameters:`);
      Object.entries(inputSchema.properties).forEach(([name, param]) => {
        const optional = !requiredParams.includes(name);
        const meta = /** @type {string[]} */ ([]);
        if (param.type)
          meta.push(param.type);
        if (optional)
          meta.push('optional');
        lines.push(`    - \`${name}\` ${meta.length ? `(${meta.join(', ')})` : ''}: ${param.description}`);
      });
    } else {
      lines.push(`  - Parameters: None`);
    }
  } else {
    lines.push(`  - Parameters: (unavailable)`);
  }
  lines.push(`  - Read-only: **${tool.type === 'readOnly'}**`);
  lines.push('');
  return lines;
}

/**
 * @param {string} content
 * @param {string} startMarker
 * @param {string} endMarker
 * @param {string[]} generatedLines
 * @returns {Promise<string>}
 */
async function updateSection(content, startMarker, endMarker, generatedLines) {
  const startMarkerIndex = content.indexOf(startMarker);
  const endMarkerIndex = content.indexOf(endMarker);
  if (startMarkerIndex === -1 || endMarkerIndex === -1)
    throw new Error('Markers for generated section not found in README');

  return [
    content.slice(0, startMarkerIndex + startMarker.length),
    '',
    generatedLines.join('\n'),
    '',
    content.slice(endMarkerIndex),
  ].join('\n');
}

/**
 * @param {string} content
 * @returns {Promise<string>}
 */
async function updateTools(content) {
  console.log('Loading tool information from compiled modules...');

  const totalTools = Object.values(categories).flat().length;
  console.log(`Found ${totalTools} tools`);

  const generatedLines = /** @type {string[]} */ ([]);
  for (const [category, categoryTools] of Object.entries(categories)) {
    generatedLines.push(`<details>\n<summary><b>${category}</b></summary>`);
    generatedLines.push('');
    for (const tool of categoryTools)
      generatedLines.push(...formatToolForReadme(tool.schema));
    generatedLines.push(`</details>`);
    generatedLines.push('');
  }

  const startMarker = `<!--- Tools generated by ${path.basename(__filename)} -->`;
  const endMarker = `<!--- End of tools generated section -->`;
  return updateSection(content, startMarker, endMarker, generatedLines);
}

/**
 * @param {string} content
 * @returns {Promise<string>}
 */
async function updateOptions(content) {
  console.log('Listing options...');
  const output = execSync('node cli.js --help');
  const lines = output.toString().split('\n');
  const firstLine = lines.findIndex(line => line.includes('--version'));
  lines.splice(0, firstLine + 1);
  const lastLine = lines.findIndex(line => line.includes('--help'));
  lines.splice(lastLine);
  const startMarker = `<!--- Options generated by ${path.basename(__filename)} -->`;
  const endMarker = `<!--- End of options generated section -->`;
  return updateSection(content, startMarker, endMarker, [
    '```',
    '> npx darbot-browser-mcp@latest --help',
    ...lines,
    '```',
  ]);
}

function usage() {
  console.log(`Usage: node utils/update-readme.js [options]

Regenerates README generated sections from compiled lib/ modules and CLI help.
Run npm run build before using this utility.

Options:
  --dry-run       Validate generation without writing README.md.
  --readme <path> Use a custom README path.
  -h, --help      Show this help.`);
}

const args = process.argv.slice(2);
let dryRun = false;
let readmePath = path.join(path.dirname(__filename), '..', 'README.md');

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--dry-run':
      dryRun = true;
      break;
    case '--readme':
      readmePath = path.resolve(args[++i] ?? '');
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

if (!readmePath) {
  console.error('--readme requires a path.');
  process.exit(2);
}

async function updateReadme() {
  const readmeContent = await fs.promises.readFile(readmePath, 'utf-8');
  const withTools = await updateTools(readmeContent);
  const withOptions = await updateOptions(withTools);
  if (dryRun) {
    console.log(`README generation succeeded for ${readmePath}; no files written.`);
    return;
  }
  await fs.promises.writeFile(readmePath, withOptions, 'utf-8');
  console.log(`README updated successfully: ${readmePath}`);
}

updateReadme().catch(err => {
  console.error('Error updating README:', err);
  process.exit(1);
});
