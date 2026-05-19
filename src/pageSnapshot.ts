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
 * Playwright's internal `_snapshotForAI` returns either a raw YAML string
 * (pre-1.50) or a structured object whose payload lives under `full`, `text`
 * or `snapshot` depending on the build. We normalise across both.
 */
type AISnapshotPayload =
  | string
  | { full?: string; text?: string; snapshot?: string };

type PageEx = playwright.Page & {
  _snapshotForAI: () => Promise<AISnapshotPayload>;
};

/**
 * Captures the latest AI-oriented snapshot of a page and exposes it as text
 * plus a locator factory for `aria-ref` references found inside the snapshot.
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
    const payload = await callOnPageNoTrace<AISnapshotPayload>(
        this._page,
        page => (page as PageEx)._snapshotForAI(),
    );
    const snapshot = normaliseSnapshotPayload(payload);
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

/**
 * Coerce the heterogeneous return value of `_snapshotForAI` into the YAML
 * string we render. Falls back to `JSON.stringify` so unknown shapes still
 * produce something useful (with logged diagnostics elsewhere).
 */
function normaliseSnapshotPayload(payload: AISnapshotPayload | undefined | null): string {
  if (payload == null)
    return '';
  if (typeof payload === 'string')
    return payload;
  if (typeof payload === 'object')
    return payload.full ?? payload.text ?? payload.snapshot ?? JSON.stringify(payload, null, 2);
  return String(payload);
}
