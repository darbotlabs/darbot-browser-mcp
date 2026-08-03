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

import { defineConfig, devices } from '@playwright/test';

import type { TestOptions } from './tests/fixtures.js';

const isCI = !!process.env.CI;

// Playwright test runner config for darbot-browser-mcp.
// Reports: GitHub annotations + console list locally, list + HTML + JUnit + blob on CI.
export default defineConfig<TestOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [
      ['list'],
      ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ['junit', { outputFile: 'test-results/junit.xml' }],
      ['github'],
    ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    video: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'msedge', use: { ...devices['Desktop Edge'], mcpBrowser: 'msedge' } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], mcpBrowser: 'chromium' } },
    // Only added when explicitly testing the published Docker image (docker
    // run darbot-browser-mcp:latest via tests/fixtures.ts createTransport).
    // Without this gate the project silently fell back to spawning a plain
    // local chromium server identical to the `chromium` project above -
    // doubling test time/resource contention while never exercising Docker.
    ...process.env.MCP_IN_DOCKER ? [{
      name: 'chromium-docker',
      use: { ...devices['Desktop Chrome'], mcpBrowser: 'chromium', mcpMode: 'docker' as const },
    }] : [],
  ],
});
