import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(extensionRoot, 'package.json');
const outputPath = path.join(extensionRoot, 'darbot-browser-mcp.vsix');

function assertCondition(condition, message) {
  if (!condition)
    throw new Error(message);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toZipPath(relativePath) {
  const zipPath = relativePath.split(path.sep).join('/');
  assertCondition(
    zipPath && !zipPath.startsWith('/') && !zipPath.split('/').includes('..'),
    `Unsafe VSIX path: ${relativePath}`,
  );
  return zipPath;
}

function resolveInsideRoot(relativePath) {
  const resolved = path.resolve(extensionRoot, relativePath);
  const rootPrefix = extensionRoot.endsWith(path.sep) ? extensionRoot : `${extensionRoot}${path.sep}`;
  assertCondition(resolved === extensionRoot || resolved.startsWith(rootPrefix), `Path escapes extension root: ${relativePath}`);
  return resolved;
}

async function readRequired(relativePath) {
  const fullPath = resolveInsideRoot(relativePath);
  const stats = await fs.lstat(fullPath);
  assertCondition(stats.isFile(), `Expected a regular file: ${relativePath}`);
  return fs.readFile(fullPath);
}

async function collectJavaScriptFiles(directory, relativeDirectory = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Symlinks are not allowed in VSIX input: ${relativePath}`);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push({ relativePath, data: await fs.readFile(fullPath) });
    }
  }

  return files;
}

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function addZipEntry(entries, name, data) {
  const zipPath = toZipPath(name);
  assertCondition(!entries.some((entry) => entry.name === zipPath), `Duplicate VSIX entry: ${zipPath}`);
  entries.push({ name: zipPath, data });
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const method = compressed.length < entry.data.length ? 8 : 0;
    const content = method === 8 ? compressed : entry.data;
    const checksum = crc32(entry.data);

    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(method),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(content.length),
      uint32(entry.data.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);
    localParts.push(localHeader, content);

    centralParts.push(Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(method),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(content.length),
      uint32(entry.data.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name,
    ]));
    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localData = Buffer.concat(localParts);
  const endOfCentralDirectory = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(localData.length),
    uint16(0),
  ]);
  return Buffer.concat([localData, centralDirectory, endOfCentralDirectory]);
}

function createContentTypes(entries) {
  const contentTypes = new Map([
    ['js', 'application/javascript'],
    ['json', 'application/json'],
    ['md', 'text/markdown'],
    ['png', 'image/png'],
    ['txt', 'text/plain'],
    ['vsixmanifest', 'text/xml'],
  ]);
  const extensions = new Set(entries.map((entry) => {
    const name = typeof entry === 'string' ? entry : entry.name;
    return name.split('.').pop();
  }));
  const defaults = [...contentTypes]
    .filter(([extension]) => extensions.has(extension))
    .map(([extension, contentType]) => `<Default Extension=".${extension}" ContentType="${contentType}"/>`)
    .join('');
  return Buffer.from(
    `<?xml version="1.0" encoding="utf-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${defaults}</Types>\n`,
    'utf8',
  );
}

function createPackageManifest(extensionPackage) {
  const repositoryUrl = typeof extensionPackage.repository === 'object'
    ? extensionPackage.repository.url
    : extensionPackage.repository;
  const keywords = Array.isArray(extensionPackage.keywords) ? extensionPackage.keywords.join(',') : '';
  const categories = Array.isArray(extensionPackage.categories) ? extensionPackage.categories.join(',') : '';
  const engine = extensionPackage.engines?.vscode;
  assertCondition(typeof extensionPackage.name === 'string', 'package.json must define name');
  assertCondition(typeof extensionPackage.publisher === 'string', 'package.json must define publisher');
  assertCondition(typeof extensionPackage.version === 'string', 'package.json must define version');
  assertCondition(typeof engine === 'string', 'package.json must define engines.vscode');

  const properties = [
    ['Microsoft.VisualStudio.Code.Engine', engine],
    ['Microsoft.VisualStudio.Code.ExtensionDependencies', ''],
    ['Microsoft.VisualStudio.Code.ExtensionPack', ''],
    ['Microsoft.VisualStudio.Code.ExtensionKind', 'workspace'],
    ['Microsoft.VisualStudio.Code.LocalizedLanguages', ''],
    ['Microsoft.VisualStudio.Code.EnabledApiProposals', ''],
    ['Microsoft.VisualStudio.Code.ExecutesCode', 'true'],
    ['Microsoft.VisualStudio.Services.Links.Source', repositoryUrl ?? ''],
    ['Microsoft.VisualStudio.Services.Links.Getstarted', repositoryUrl ?? ''],
    ['Microsoft.VisualStudio.Services.Links.GitHub', repositoryUrl ?? ''],
    ['Microsoft.VisualStudio.Services.Links.Support', extensionPackage.bugs?.url ?? ''],
    ['Microsoft.VisualStudio.Services.Links.Learn', extensionPackage.homepage ?? repositoryUrl ?? ''],
    ['Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown', 'true'],
    ['Microsoft.VisualStudio.Services.Content.Pricing', 'Free'],
  ];
  const propertyXml = properties
    .map(([id, value]) => `\t\t\t\t<Property Id="${escapeXml(id)}" Value="${escapeXml(value)}" />`)
    .join('\n');
  const assets = [
    ['Microsoft.VisualStudio.Code.Manifest', 'extension/package.json'],
    ['Microsoft.VisualStudio.Services.Content.Details', 'extension/readme.md'],
    ['Microsoft.VisualStudio.Services.Content.License', 'extension/LICENSE.txt'],
  ];
  if (extensionPackage.icon)
    assets.push(['Microsoft.VisualStudio.Services.Icons.Default', `extension/${toZipPath(extensionPackage.icon)}`]);
  const assetXml = assets
    .map(([type, assetPath]) => `<Asset Type="${escapeXml(type)}" Path="${escapeXml(assetPath)}" Addressable="true" />`)
    .join('\n');

  return Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
\t<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
\t\t<Metadata>
\t\t\t<Identity Language="en-US" Id="${escapeXml(extensionPackage.name)}" Version="${escapeXml(extensionPackage.version)}" Publisher="${escapeXml(extensionPackage.publisher)}" />
\t\t\t<DisplayName>${escapeXml(extensionPackage.displayName ?? extensionPackage.name)}</DisplayName>
\t\t\t<Description xml:space="preserve">${escapeXml(extensionPackage.description ?? '')}</Description>
\t\t\t<Tags>${escapeXml(keywords)}</Tags>
\t\t\t<Categories>${escapeXml(categories)}</Categories>
\t\t\t<GalleryFlags>Public</GalleryFlags>
\t\t\t<Properties>
${propertyXml}
\t\t\t</Properties>
\t\t\t<License>extension/LICENSE.txt</License>
\t\t\t${extensionPackage.icon ? `<Icon>extension/${toZipPath(extensionPackage.icon)}</Icon>` : ''}
\t\t</Metadata>
\t\t<Installation>
\t\t\t<InstallationTarget Id="Microsoft.VisualStudio.Code"/>
\t\t</Installation>
\t\t<Dependencies/>
\t\t<Assets>
${assetXml}
\t\t</Assets>
\t</PackageManifest>
`, 'utf8');
}

async function main() {
  const extensionPackage = JSON.parse(await fs.readFile(packagePath, 'utf8'));
  const packageJson = await readRequired('package.json');
  const readme = await readRequired('README.md');
  const license = await readRequired('LICENSE');
  const icon = extensionPackage.icon ? await readRequired(extensionPackage.icon) : null;
  const compiledFiles = await collectJavaScriptFiles(resolveInsideRoot('out'), 'out');
  const entries = [];
  const contentTypeNames = [
    'extension.vsixmanifest',
    'extension/readme.md',
    'extension/package.json',
    'extension/LICENSE.txt',
    ...(icon ? [`extension/${extensionPackage.icon}`] : []),
    ...compiledFiles.map((file) => `extension/${file.relativePath}`),
  ];

  addZipEntry(entries, 'extension.vsixmanifest', createPackageManifest(extensionPackage));
  addZipEntry(entries, '[Content_Types].xml', createContentTypes(contentTypeNames));
  addZipEntry(entries, 'extension/readme.md', readme);
  addZipEntry(entries, 'extension/package.json', packageJson);
  addZipEntry(entries, 'extension/LICENSE.txt', license);
  if (icon)
    addZipEntry(entries, `extension/${extensionPackage.icon}`, icon);
  for (const file of compiledFiles)
    addZipEntry(entries, `extension/${file.relativePath}`, file.data);

  const main = String(extensionPackage.main ?? '');
  const mainRelative = main.startsWith('./') ? main.slice(2) : main;
  const mainPath = `extension/${mainRelative.split(path.sep).join('/')}`;
  assertCondition(entries.some((entry) => entry.name === mainPath), `Compiled extension entry point is missing: ${mainPath}`);
  assertCondition(compiledFiles.length > 0, 'No compiled JavaScript files were found under out/');

  const outputFile = `${extensionPackage.name}-${extensionPackage.version}.vsix`;
  const output = path.join(extensionRoot, outputFile);
  await fs.writeFile(output, createZip(entries));
  if (output !== outputPath)
    await fs.rm(outputPath, { force: true });
  console.log(`Packaged: ${output}`);
  console.log(`Files: ${entries.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
