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

import { callOnPageNoTrace } from './tools/utils.js';

/**
 * Captures the latest AI-oriented snapshot of a page and exposes it as text
 * plus a locator factory for `aria-ref` references found inside the snapshot.
 *
 * As of playwright-core 1.60 the internal `_snapshotForAI()` helper has been
 * removed in favor of the public `page.ariaSnapshot({ mode: 'ai' })` API,
 * which returns the YAML string directly (no payload-shape variance).
 */
export class PageSnapshot {
  private readonly _page: playwright.Page;
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

  private async _build(): Promise<void> {
    const snapshot = await callOnPageNoTrace(
        this._page,
        page => page.ariaSnapshot({ mode: 'ai' }),
    );
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
