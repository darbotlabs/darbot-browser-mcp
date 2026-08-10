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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runVSCodeCommand } from '@vscode/test-electron';

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'darbot-browser-vscode-test-'));
  const userDataDir = path.join(testRoot, 'user-data');
  const extensionsDir = path.join(testRoot, 'extensions');

  try {
    const result = await runVSCodeCommand([
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-updates',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--disable-extensions',
      `--user-data-dir=${userDataDir}`,
      `--extensions-dir=${extensionsDir}`,
      `--extensionTestsPath=${extensionTestsPath}`,
      `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
    ], {
      version: '1.132.0',
      spawn: { windowsHide: true },
    });
    if (result.stdout)
      process.stdout.write(result.stdout);
    if (result.stderr)
      process.stderr.write(result.stderr);
  } catch (err) {
    console.error('Failed to run VS Code extension tests:', err instanceof Error ? err.stack ?? err.message : String(err));
    process.exitCode = 1;
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

void main();
