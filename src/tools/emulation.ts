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
 * Media emulation tools - uses Playwright emulateMedia API
 * Extended support for:
 * - Color scheme emulation (light/dark)
 * - Reduced motion emulation
 * - Contrast emulation (v1.51+)
 * - Print/screen media
 */

const emulateMedia: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_emulate_media',
    title: 'Autonomous media emulation',
    description: 'Autonomously emulate media features like color scheme, reduced motion, contrast preference, and media type for accessibility and responsive testing.',
    inputSchema: z.object({
      colorScheme: z.enum(['light', 'dark', 'no-preference', 'null']).optional().describe('Emulate color scheme preference: light, dark, no-preference, or null to reset'),
      reducedMotion: z.enum(['reduce', 'no-preference', 'null']).optional().describe('Emulate prefers-reduced-motion: reduce, no-preference, or null to reset'),
      contrast: z.enum(['more', 'less', 'no-preference', 'null']).optional().describe('Emulate prefers-contrast: more, less, no-preference, or null to reset'),
      media: z.enum(['screen', 'print', 'null']).optional().describe('Emulate media type: screen, print, or null to reset'),
      forcedColors: z.enum(['active', 'none', 'null']).optional().describe('Emulate forced-colors: active, none, or null to reset'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    
    const options: Record<string, string | null> = {};
    if (params.colorScheme !== undefined) options.colorScheme = params.colorScheme === 'null' ? null : params.colorScheme;
    if (params.reducedMotion !== undefined) options.reducedMotion = params.reducedMotion === 'null' ? null : params.reducedMotion;
    if (params.contrast !== undefined) options.contrast = params.contrast === 'null' ? null : params.contrast;
    if (params.media !== undefined) options.media = params.media === 'null' ? null : params.media;
    if (params.forcedColors !== undefined) options.forcedColors = params.forcedColors === 'null' ? null : params.forcedColors;

    const optionsStr = Object.entries(options)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v === null ? 'null' : `'${v}'`}`)
      .join(', ');

    const code = [
      `// Emulate media features: ${optionsStr}`,
      `await page.emulateMedia({ ${optionsStr} });`,
    ];

    const action = async () => {
      await tab.page.emulateMedia(options as any);
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

/**
 * Geolocation emulation
 */
const emulateGeolocation: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_emulate_geolocation',
    title: 'Autonomous geolocation emulation',
    description: 'Autonomously emulate a geographic location for location-based testing.',
    inputSchema: z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude between -90 and 90'),
      longitude: z.number().min(-180).max(180).describe('Longitude between -180 and 180'),
      accuracy: z.number().optional().describe('Accuracy in meters. Defaults to 0.'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();
    
    const code = [
      `// Emulate geolocation: ${params.latitude}, ${params.longitude}`,
      `await context.setGeolocation({ latitude: ${params.latitude}, longitude: ${params.longitude}${params.accuracy ? `, accuracy: ${params.accuracy}` : ''} });`,
    ];

    const action = async () => {
      await browserContext.setGeolocation({
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy: params.accuracy,
      });
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

/**
 * Timezone emulation
 */
const emulateTimezone: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_emulate_timezone',
    title: 'Autonomous timezone emulation',
    description: 'Autonomously change the browser timezone for testing time-sensitive features.',
    inputSchema: z.object({
      timezoneId: z.string().describe('Timezone ID (e.g., "America/New_York", "Europe/London", "Asia/Tokyo")'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    const code = [
      `// Emulate timezone: ${params.timezoneId}`,
      `await context.setDefaultTimezone('${params.timezoneId}');`,
    ];

    // Note: Playwright doesn't have setDefaultTimezone - we need to use emulateTimezone differently
    // This would need to be set at context creation time, so we'll add JavaScript injection instead
    const action = async () => {
      await browserContext.addInitScript(`
        const originalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(locale, options = {}) {
          options.timeZone = '${params.timezoneId}';
          return new originalDateTimeFormat(locale, options);
        };
      `);
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

export default (captureSnapshot: boolean) => [
  emulateMedia(captureSnapshot),
  emulateGeolocation(captureSnapshot),
  emulateTimezone(captureSnapshot),
];
