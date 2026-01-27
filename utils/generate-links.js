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

/**
 * Generates VS Code MCP install URLs for the Darbot Browser MCP package.
 * Usage: node utils/generate-links.js
 * Output: URL that can be used to install via VS Code marketplace redirect
 */

const config = JSON.stringify({ name: 'darbot-browser', command: 'npx', args: ['@darbotlabs/darbot-browser-mcp@latest'] });
const urlForWebsites = `vscode:mcp/install?${encodeURIComponent(config)}`;
// Github markdown does not allow linking to `vscode:` directly, so use redirect:
const urlForGithub = `https://insiders.vscode.dev/redirect?url=${encodeURIComponent(urlForWebsites)}`;

console.log('VS Code MCP Install URL:');
console.log(urlForGithub);