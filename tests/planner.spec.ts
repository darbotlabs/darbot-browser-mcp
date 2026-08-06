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

import { test, expect } from '@playwright/test';
import { MemoryManager } from '../src/memory.js';
import { BFSPlanner, type PlannerConfig, type PlannerObservation } from '../src/planner.js';

function observation(url: string, links: string[]): PlannerObservation {
  return {
    url,
    title: url,
    domSnapshot: '',
    links: links.map((href, index) => ({
      href,
      text: `Link ${index}`,
      selector: `a:nth-of-type(${index + 1})`,
    })),
    clickableElements: [],
  };
}

function planner(strategy: PlannerConfig['strategy'], goalDescription?: string): BFSPlanner {
  return new BFSPlanner({
    maxDepth: 4,
    maxPages: 20,
    timeout: 30000,
    strategy,
    ...(goalDescription !== undefined && { goalDescription }),
  }, new MemoryManager({ enabled: false }));
}

test('planner discovers links on the final queued page before finishing', async () => {
  const crawlPlanner = planner('bfs');
  await crawlPlanner.initialize('https://example.test/');

  const first = await crawlPlanner.planNextAction(observation(
      'https://example.test/',
      ['https://example.test/page-a']
  ));
  expect(first).toMatchObject({ type: 'navigate', url: 'https://example.test/page-a' });

  const second = await crawlPlanner.planNextAction(observation(
      'https://example.test/page-a',
      ['https://example.test/page-b']
  ));
  expect(second).toMatchObject({ type: 'navigate', url: 'https://example.test/page-b' });
});

test('BFS chooses shallower queued URLs while DFS follows the newest depth', async () => {
  const bfs = planner('bfs');
  const dfs = planner('dfs');
  for (const current of [bfs, dfs]) {
    await current.initialize('https://example.test/');
    const first = await current.planNextAction(observation(
        'https://example.test/',
        ['https://example.test/article-a', 'https://example.test/category-b']
    ));
    expect(first.url).toBe('https://example.test/article-a');
  }

  const bfsNext = await bfs.planNextAction(observation(
      'https://example.test/article-a',
      ['https://example.test/article-child']
  ));
  const dfsNext = await dfs.planNextAction(observation(
      'https://example.test/article-a',
      ['https://example.test/article-child']
  ));

  expect(bfsNext.url).toBe('https://example.test/category-b');
  expect(dfsNext.url).toBe('https://example.test/article-child');
});

test('focused strategy prioritizes URLs matching the crawl goal', async () => {
  const focused = planner('focused', 'security audit');
  await focused.initialize('https://example.test/');

  const action = await focused.planNextAction(observation(
      'https://example.test/',
      ['https://example.test/article-general', 'https://example.test/security']
  ));
  expect(action).toMatchObject({
    type: 'navigate',
    url: 'https://example.test/security',
  });
});
