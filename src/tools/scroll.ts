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

import { z } from 'zod';
import { defineTool, type ToolFactory } from './tool.js';

/**
 * Mouse wheel scrolling tool - uses Playwright 1.15+ mouse.wheel() API
 * Allows precise scrolling by delta values, useful for:
 * - Testing infinite scroll pages
 * - Revealing lazy-loaded content
 * - Navigating long pages
 */
const mouseWheel: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_scroll',
    title: 'Autonomous page scrolling',
    description: 'Autonomously scroll the page using mouse wheel. Positive deltaY scrolls down, negative scrolls up. Positive deltaX scrolls right, negative scrolls left.',
    inputSchema: z.object({
      deltaX: z.number().optional().default(0).describe('Horizontal scroll amount in pixels. Positive scrolls right, negative scrolls left.'),
      deltaY: z.number().optional().default(0).describe('Vertical scroll amount in pixels. Positive scrolls down, negative scrolls up.'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const deltaX = params.deltaX ?? 0;
    const deltaY = params.deltaY ?? 0;

    const code = [
      `// Scroll page by (${deltaX}, ${deltaY}) pixels`,
      `await page.mouse.wheel(${deltaX}, ${deltaY});`,
    ];

    const action = async () => {
      await tab.page.mouse.wheel(deltaX, deltaY);
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: true,
    };
  },
});

/**
 * Scroll to element tool - scrolls an element into view
 */
const scrollToElement: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_scroll_to_element',
    title: 'Autonomous scroll to element',
    description: 'Autonomously scroll an element into view. Useful for revealing elements before interacting with them.',
    inputSchema: z.object({
      element: z.string().describe('Human-readable element description for permission'),
      ref: z.string().describe('Exact target element reference from the page snapshot'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const snapshot = tab.snapshotOrDie();
    const locator = snapshot.refLocator(params);

    const code = [
      `// Scroll ${params.element} into view`,
      `await page.locator('[ref="${params.ref}"]').scrollIntoViewIfNeeded();`,
    ];

    const action = async () => {
      await locator.scrollIntoViewIfNeeded();
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: true,
    };
  },
});

export default (captureSnapshot: boolean) => [
  mouseWheel(captureSnapshot),
  scrollToElement(captureSnapshot),
];
