import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src', 'tools');
const outputPath = path.join(root, 'tool-atlas.csv');

async function collectSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory())
      files.push(...await collectSourceFiles(entryPath));
    else if (entry.name.endsWith('.ts'))
      files.push(entryPath);
  }
  return files.sort();
}

function csv(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

const { allTools, snapshotTools, visionOnlyTools } = await import('../lib/tools.js');
const { packageJSON: builtPackage } = await import('../lib/package.js');
const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
if (builtPackage.version !== packageJson.version)
  throw new Error(`Built package version ${builtPackage.version} does not match package.json version ${packageJson.version}`);
const sourceFiles = await collectSourceFiles(sourceRoot);
const sourceByTool = new Map();

for (const sourceFile of sourceFiles) {
  const source = await fs.readFile(sourceFile, 'utf8');
  const relativePath = path.relative(root, sourceFile).replaceAll(path.sep, '/');
  for (const match of source.matchAll(/name:\s*['"]([^'"]+)['"]/g)) {
    if (!sourceByTool.has(match[1])) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      sourceByTool.set(match[1], { path: relativePath, line });
    }
  }
}

const snapshotNames = new Set(snapshotTools.map(tool => tool.schema.name));
const screenNames = new Set(visionOnlyTools.map(tool => tool.schema.name));
const headers = [
  'package_version',
  'tool_name',
  'title',
  'description',
  'tool_type',
  'capability',
  'surface',
  'source_script',
  'source_line',
  'implementation_status',
];
const rows = [headers.map(csv).join(',')];

for (const tool of allTools) {
  const source = sourceByTool.get(tool.schema.name);
  if (!source)
    throw new Error(`No source script found for ${tool.schema.name}`);
  rows.push([
    packageJson.version,
    tool.schema.name,
    tool.schema.title,
    tool.schema.description,
    tool.schema.type,
    tool.capability ?? 'core',
    screenNames.has(tool.schema.name) ? 'coordinate-screen' : snapshotNames.has(tool.schema.name) ? 'accessibility-snapshot' : 'unclassified',
    source.path,
    source.line,
    'implemented',
  ].map(csv).join(','));
}

if (rows.length - 1 !== allTools.length)
  throw new Error(`Atlas row count ${rows.length - 1} does not match tool count ${allTools.length}`);

await fs.writeFile(outputPath, rows.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length - 1} tool atlas rows to ${path.relative(root, outputPath)}`);
