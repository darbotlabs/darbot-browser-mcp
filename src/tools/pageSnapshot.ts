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

import * as playwright from 'playwright';
import { callOnPageNoTrace } from './utils.js';

/**
 * Shape of `_snapshotForAI()` results across Playwright versions.
 *
 * Older Playwright builds returned a bare `string`. Newer builds return an
 * object whose payload property has shifted across releases (`full`, `text`,
 * or `snapshot`). We accept all three and fall through to `JSON.stringify`
 * so a future internal schema change doesn't crash callers.
 */
type SnapshotResult =
  | string
  | { full: string }
  | { text: string }
  | { snapshot: string }
  | Record<string, unknown>;

type PageEx = playwright.Page & {
  _snapshotForAI: () => Promise<SnapshotResult>;
};

function extractSnapshotText(result: SnapshotResult): string {
  if (typeof result === 'string')
    return result;
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.full === 'string')
      return obj.full;
    if (typeof obj.text === 'string')
      return obj.text;
    if (typeof obj.snapshot === 'string')
      return obj.snapshot;
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

export class PageSnapshot {
  private _page: playwright.Page;
  private _text!: string;

  constructor(page: playwright.Page) {
    this._page = page;
  }

  static async create(page: playwright.Page): Promise<PageSnapshot> {
    const snapshot = new PageSnapshot(page);
    await snapshot._build();
    return snapshot;
  }

  text(): string {
    return this._text;
  }

  private async _build() {
    const snapshotResult = await callOnPageNoTrace(this._page, page => (page as PageEx)._snapshotForAI());
    const snapshot = extractSnapshotText(snapshotResult);
    this._text = [
      `- Page Snapshot`,
      '```yaml',
      snapshot,
      '```',
    ].join('\n');
  }

  refLocator(params: { element: string, ref: string }): playwright.Locator {
    return this._page.locator(`aria-ref=${params.ref}`).describe(params.element);
  }
}
