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
 * Clock API tools - uses Playwright 1.45+ Clock API
 * Allows manipulation of time for testing time-sensitive features:
 * - Testing timeouts
 * - Testing animations  
 * - Testing scheduled tasks
 * - Simulating time passage
 */

const installClock: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clock_install',
    title: 'Autonomous clock installation',
    description: 'Autonomously install fake clock to control time in the browser. Useful for testing time-dependent behavior like animations, timeouts, and scheduled tasks.',
    inputSchema: z.object({
      time: z.string().optional().describe('Initial time to set in ISO 8601 format (e.g., "2024-02-02T08:00:00"). Defaults to current time if not specified.'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const time = params.time ? new Date(params.time) : undefined;

    const code = time 
      ? [
          `// Install fake clock with initial time ${params.time}`,
          `await page.clock.install({ time: new Date('${params.time}') });`,
        ]
      : [
          `// Install fake clock with current time`,
          `await page.clock.install();`,
        ];

    const action = async () => {
      await tab.page.clock.install({ time });
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

const fastForwardClock: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clock_fast_forward',
    title: 'Autonomous time fast-forward',
    description: 'Autonomously advance the fake clock time by a specified duration. Timers and animations will fire as if that time had passed.',
    inputSchema: z.object({
      milliseconds: z.number().describe('Number of milliseconds to fast forward'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Fast forward clock by ${params.milliseconds}ms`,
      `await page.clock.fastForward(${params.milliseconds});`,
    ];

    const action = async () => {
      await tab.page.clock.fastForward(params.milliseconds);
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: true,
    };
  },
});

const pauseClock: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clock_pause',
    title: 'Autonomous clock pause',
    description: 'Autonomously pause the clock at a specific time. Time will stop until resumed.',
    inputSchema: z.object({
      time: z.string().optional().describe('Time to pause at in ISO 8601 format. If not specified, pauses at current fake time.'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const time = params.time ? new Date(params.time) : undefined;

    const code = time
      ? [
          `// Pause clock at ${params.time}`,
          `await page.clock.pauseAt(new Date('${params.time}'));`,
        ]
      : [
          `// Pause clock at current time`,
          `await page.clock.pauseAt(Date.now());`,
        ];

    const action = async () => {
      await tab.page.clock.pauseAt(time ?? Date.now());
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

const resumeClock: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clock_resume',
    title: 'Autonomous clock resume',
    description: 'Autonomously resume the paused clock. Time will continue flowing from where it was paused.',
    inputSchema: z.object({}),
    type: 'destructive',
  },

  handle: async context => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Resume clock`,
      `await page.clock.resume();`,
    ];

    const action = async () => {
      await tab.page.clock.resume();
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: true,
    };
  },
});

const setClockFixedTime: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clock_set_fixed_time',
    title: 'Autonomous fixed time setting',
    description: 'Autonomously set a fixed time that will be returned by Date.now() and new Date(). Time will not advance automatically.',
    inputSchema: z.object({
      time: z.string().describe('Fixed time to set in ISO 8601 format (e.g., "2024-12-25T00:00:00")'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const time = new Date(params.time);

    const code = [
      `// Set fixed time to ${params.time}`,
      `await page.clock.setFixedTime(new Date('${params.time}'));`,
    ];

    const action = async () => {
      await tab.page.clock.setFixedTime(time);
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
  installClock(captureSnapshot),
  fastForwardClock(captureSnapshot),
  pauseClock(captureSnapshot),
  resumeClock(captureSnapshot),
  setClockFixedTime(captureSnapshot),
];
