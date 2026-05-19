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
 * Storage state tools — IndexedDB support from Playwright 1.51+.
 *
 * Tools for inspecting and mutating browser storage:
 * - Persist storage state (cookies, localStorage, optionally IndexedDB) to disk
 * - List, set, and clear cookies
 * - Read and write localStorage entries
 *
 * Every tool acquires the active tab via `context.currentTabOrDie()`, which
 * raises an explicit error if no page is available.
 */

import { z } from 'zod';
import { defineTool } from './tool.js';
import { outputFile } from '../config.js';

import type { BrowserContext } from 'playwright';

type AddCookieParam = Parameters<BrowserContext['addCookies']>[0][number];
type ClearCookieFilter = NonNullable<Parameters<BrowserContext['clearCookies']>[0]>;
type StorageStateOptions = NonNullable<Parameters<BrowserContext['storageState']>[0]>;

const saveStorageStateSchema = z.object({
  filename: z
      .string()
      .optional()
      .describe('Destination file name. Defaults to `storage-state-{ISO timestamp}.json` inside the configured output directory.'),
  includeIndexedDB: z
      .boolean()
      .optional()
      .default(false)
      .describe('When true, also serialize IndexedDB contents (Playwright 1.51+). Required for apps like Firebase Auth.'),
});

/**
 * Persist the active browser context's storage state to disk.
 *
 * @example
 * await browser_save_storage_state({ filename: 'auth.json', includeIndexedDB: true });
 */
const saveStorageState = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_save_storage_state',
    title: 'Autonomous storage state saving',
    description: 'Save the active browser context\'s storage state (cookies, localStorage, and optionally IndexedDB) to a JSON file for later reuse.',
    inputSchema: saveStorageStateSchema,
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();
    const fileName = await outputFile(
        context.config,
        params.filename ?? `storage-state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );

    const code = [
      `// Save storage state${params.includeIndexedDB ? ' (including IndexedDB)' : ''} to ${fileName}`,
      `await context.storageState({ path: '${fileName}'${params.includeIndexedDB ? ', indexedDB: true' : ''} });`,
    ];

    const action = async () => {
      const options: StorageStateOptions = { path: fileName };
      if (params.includeIndexedDB)
        options.indexedDB = true;
      await browserContext.storageState(options);
      return {
        content: [{ type: 'text' as const, text: `Storage state saved to: ${fileName}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const getCookiesSchema = z.object({
  urls: z
      .array(z.string().url())
      .optional()
      .describe('Optional list of absolute URLs to filter cookies by. When omitted, returns every cookie in the context.'),
});

/**
 * Retrieve cookies from the active browser context, optionally filtered by URL.
 *
 * @example
 * await browser_get_cookies({ urls: ['https://example.com'] });
 */
const getCookies = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_get_cookies',
    title: 'Autonomous cookie retrieval',
    description: 'Retrieve browser cookies for the active context, optionally filtered to a set of URLs.',
    inputSchema: getCookiesSchema,
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    const code = params.urls
      ? [
        `// Get cookies for specified URLs`,
        `const cookies = await context.cookies(${JSON.stringify(params.urls)});`,
      ]
      : [
        `// Get all cookies`,
        `const cookies = await context.cookies();`,
      ];

    const action = async () => {
      const cookies = params.urls
        ? await browserContext.cookies(params.urls)
        : await browserContext.cookies();

      if (cookies.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No cookies found.' }]
        };
      }

      const output = cookies.map(cookie => {
        return [
          `🍪 ${cookie.name}`,
          `   Value: ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`,
          `   Domain: ${cookie.domain}`,
          `   Path: ${cookie.path}`,
          `   Expires: ${cookie.expires === -1 ? 'Session' : new Date(cookie.expires * 1000).toISOString()}`,
          `   Secure: ${cookie.secure}, HttpOnly: ${cookie.httpOnly}`,
        ].join('\n');
      }).join('\n\n');

      return {
        content: [{ type: 'text' as const, text: `Found ${cookies.length} cookies:\n\n${output}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const setCookieSchema = z.object({
  name: z.string().min(1).describe('Cookie name.'),
  value: z.string().describe('Cookie value.'),
  url: z.string().url().optional().describe('Absolute URL the cookie applies to. Either `url` or both `domain` and `path` are required.'),
  domain: z.string().optional().describe('Cookie domain (e.g. `.example.com`). Required when `url` is omitted.'),
  path: z.string().optional().default('/').describe('Cookie path. Defaults to `/`.'),
  expires: z.number().int().optional().describe('Unix epoch seconds for cookie expiry. Omit for a session cookie.'),
  httpOnly: z.boolean().optional().default(false).describe('Mark cookie as HTTP-only (not exposed to JavaScript).'),
  secure: z.boolean().optional().default(false).describe('Require HTTPS for cookie transmission.'),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional().describe('SameSite attribute controlling cross-site cookie behavior.'),
});

/**
 * Add a cookie to the active browser context.
 *
 * @example
 * await browser_set_cookie({ name: 'session', value: 'abc', url: 'https://example.com' });
 */
const setCookie = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_set_cookie',
    title: 'Autonomous cookie setting',
    description: 'Add a single cookie to the active browser context. Either `url`, or both `domain` and `path`, must be provided.',
    inputSchema: setCookieSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    // Build a strongly-typed Playwright cookie payload, omitting absent fields
    // so we don't override Playwright's defaults with `undefined`.
    const cookie: AddCookieParam = {
      name: params.name,
      value: params.value,
    };

    if (params.url !== undefined) cookie.url = params.url;
    if (params.domain !== undefined) cookie.domain = params.domain;
    if (params.path !== undefined) cookie.path = params.path;
    if (params.expires !== undefined) cookie.expires = params.expires;
    if (params.httpOnly !== undefined) cookie.httpOnly = params.httpOnly;
    if (params.secure !== undefined) cookie.secure = params.secure;
    if (params.sameSite !== undefined) cookie.sameSite = params.sameSite;

    const code = [
      `// Set cookie: ${params.name}`,
      `await context.addCookies([${JSON.stringify(cookie)}]);`,
    ];

    const action = async () => {
      await browserContext.addCookies([cookie]);
      return {
        content: [{ type: 'text' as const, text: `Cookie '${params.name}' has been set.` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const clearCookiesSchema = z.object({
  name: z.string().optional().describe('Only clear cookies with this exact name.'),
  domain: z.string().optional().describe('Only clear cookies for this domain.'),
  path: z.string().optional().describe('Only clear cookies with this path.'),
});

/**
 * Clear cookies in the active browser context, optionally filtered by
 * name, domain, or path. With no filters, clears every cookie.
 *
 * @example
 * await browser_clear_cookies({ domain: '.example.com' });
 */
const clearCookies = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clear_cookies',
    title: 'Autonomous cookie clearing',
    description: 'Clear browser cookies in the active context, optionally filtered by name, domain, or path. With no filters, clears all cookies.',
    inputSchema: clearCookiesSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    const filter: ClearCookieFilter = {};
    if (params.name !== undefined) filter.name = params.name;
    if (params.domain !== undefined) filter.domain = params.domain;
    if (params.path !== undefined) filter.path = params.path;

    const hasFilter = Object.keys(filter).length > 0;
    const filterDesc = hasFilter
      ? `(${Object.entries(filter).map(([k, v]) => `${k}: ${v}`).join(', ')})`
      : '(all)';

    const code = [
      `// Clear cookies ${filterDesc}`,
      `await context.clearCookies(${hasFilter ? JSON.stringify(filter) : ''});`,
    ];

    const action = async () => {
      if (hasFilter)
        await browserContext.clearCookies(filter);
      else
        await browserContext.clearCookies();
      return {
        content: [{ type: 'text' as const, text: `Cookies cleared ${filterDesc}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Retrieve every localStorage entry for the active page.
 *
 * @example
 * await browser_get_local_storage({});
 */
const getLocalStorage = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_get_local_storage',
    title: 'Autonomous localStorage retrieval',
    description: 'Retrieve all localStorage entries for the current page. Values longer than 100 chars are truncated in the human-readable output.',
    inputSchema: z.object({}).describe('No input parameters.'),
    type: 'readOnly',
  },

  handle: async context => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Get all localStorage items`,
      `const storage = await page.evaluate(() => JSON.stringify(localStorage));`,
    ];

    const action = async () => {
      const storage = await tab.page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key)
            items[key] = localStorage.getItem(key) || '';
        }
        return items;
      });

      const keys = Object.keys(storage);
      if (keys.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'localStorage is empty.' }]
        };
      }

      const output = keys.map(key => {
        const value = storage[key];
        const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
        return `${key}\n   ${displayValue}`;
      }).join('\n\n');

      return {
        content: [{ type: 'text' as const, text: `Found ${keys.length} localStorage items:\n\n${output}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const setLocalStorageSchema = z.object({
  key: z.string().min(1).describe('localStorage key to write.'),
  value: z.string().describe('Value to associate with the key. Pass a JSON-encoded string for structured data.'),
});

/**
 * Set a localStorage entry for the active page.
 *
 * @example
 * await browser_set_local_storage({ key: 'theme', value: 'dark' });
 */
const setLocalStorage = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_set_local_storage',
    title: 'Autonomous localStorage setting',
    description: 'Set a localStorage entry on the current page. Overwrites any existing value for the key.',
    inputSchema: setLocalStorageSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Set localStorage item: ${params.key}`,
      `await page.evaluate(([key, value]) => localStorage.setItem(key, value), [${JSON.stringify(params.key)}, ${JSON.stringify(params.value)}]);`,
    ];

    const action = async () => {
      await tab.page.evaluate(([key, value]) => {
        localStorage.setItem(key, value);
      }, [params.key, params.value]);
      return {
        content: [{ type: 'text' as const, text: `localStorage['${params.key}'] has been set.` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

export default [
  saveStorageState,
  getCookies,
  setCookie,
  clearCookies,
  getLocalStorage,
  setLocalStorage,
];
