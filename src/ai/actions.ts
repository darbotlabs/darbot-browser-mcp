/// <reference lib="dom" />
/* global document */
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
 * Shared helpers that turn AI intent / workflow steps into real browser work.
 * Prefer registered MCP tools via `context.run` so capability gates and
 * snapshots stay consistent with the rest of the product.
 */

import type { Context } from '../context.js';
import type { Tool } from '../tools/tool.js';

export type ActionResult = {
  success: boolean;
  action: string;
  detail?: string;
  error?: string;
};

function findTool(context: Context, name: string): Tool | undefined {
  return context.tools.find(t => t.schema.name === name);
}

/** Invoke a registered tool by name; throws if the tool is missing. */
export async function runTool(
  context: Context,
  name: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const tool = findTool(context, name);
  if (!tool)
    throw new Error(`Tool '${name}' is not registered`);
  return context.run(tool, params);
}

/**
 * Resolve a human element description to a Playwright locator.
 * Tries role/name, label, placeholder, then visible text.
 */
export async function resolveLocator(context: Context, element: string) {
  const tab = context.currentTabOrDie();
  const page = tab.page;
  const candidates = [
    page.getByRole('button', { name: element, exact: false }),
    page.getByRole('link', { name: element, exact: false }),
    page.getByRole('textbox', { name: element, exact: false }),
    page.getByLabel(element, { exact: false }),
    page.getByPlaceholder(element, { exact: false }),
    page.getByText(element, { exact: false }),
  ];

  for (const locator of candidates) {
    const count = await locator.count().catch(() => 0);
    if (count > 0) {
      const first = locator.first();
      if (await first.isVisible().catch(() => false))
        return first;
    }
  }

  // Last resort: CSS / text selector as provided.
  return page.locator(element).first();
}

export async function executeNavigate(context: Context, params: { url?: string }): Promise<ActionResult> {
  if (!params.url)
    return { success: false, action: 'navigate', error: 'Missing url' };
  await runTool(context, 'browser_navigate', { url: params.url });
  return { success: true, action: 'navigate', detail: params.url };
}

export async function executeClick(context: Context, params: { element?: string; ref?: string }): Promise<ActionResult> {
  if (params.ref && params.element) {
    await runTool(context, 'browser_click', { element: params.element, ref: params.ref });
    return { success: true, action: 'click', detail: params.element };
  }
  if (!params.element)
    return { success: false, action: 'click', error: 'Missing element' };

  // Ensure a snapshot exists for subsequent ref-based tools.
  await runTool(context, 'browser_snapshot', {}).catch(() => undefined);

  const locator = await resolveLocator(context, params.element);
  await locator.click({ timeout: 15000 });
  return { success: true, action: 'click', detail: params.element };
}

export async function executeType(context: Context, params: { text?: string; element?: string; ref?: string }): Promise<ActionResult> {
  if (params.text === undefined)
    return { success: false, action: 'type', error: 'Missing text' };

  if (params.ref && params.element) {
    await runTool(context, 'browser_type', {
      element: params.element,
      ref: params.ref,
      text: params.text,
    });
    return { success: true, action: 'type', detail: params.element };
  }

  if (!params.element)
    return { success: false, action: 'type', error: 'Missing element' };

  await runTool(context, 'browser_snapshot', {}).catch(() => undefined);
  const locator = await resolveLocator(context, params.element);
  await locator.fill(String(params.text), { timeout: 15000 });
  return { success: true, action: 'type', detail: `${params.element} <= ${params.text}` };
}

export async function executeSubmitForm(context: Context, _params: Record<string, unknown>): Promise<ActionResult> {
  const tab = context.currentTabOrDie();
  const submitted = await tab.page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form)
      return false;
    if (typeof form.requestSubmit === 'function')
      form.requestSubmit();
    else
      form.submit();
    return true;
  });
  if (!submitted)
    return { success: false, action: 'submit_form', error: 'No form found on page' };
  return { success: true, action: 'submit_form' };
}

export async function executeSearch(context: Context, params: { query?: string }): Promise<ActionResult> {
  if (!params.query)
    return { success: false, action: 'search', error: 'Missing query' };

  await runTool(context, 'browser_snapshot', {}).catch(() => undefined);
  const tab = context.currentTabOrDie();
  const searchBox = tab.page
      .getByRole('searchbox')
      .or(tab.page.getByRole('textbox', { name: /search/i }))
      .or(tab.page.locator('input[type="search"], input[name*="search" i], input[placeholder*="search" i]'))
      .first();

  if (await searchBox.count() === 0)
    return { success: false, action: 'search', error: 'No search input found' };

  await searchBox.fill(params.query, { timeout: 15000 });
  await searchBox.press('Enter');
  return { success: true, action: 'search', detail: params.query };
}

export async function executeWaitFor(context: Context, params: { target?: string; text?: string; time?: number }): Promise<ActionResult> {
  const text = params.text || params.target;
  if (params.time !== undefined) {
    await runTool(context, 'browser_wait_for', { time: params.time });
    return { success: true, action: 'wait_for', detail: `time=${params.time}` };
  }
  if (text) {
    await runTool(context, 'browser_wait_for', { text });
    return { success: true, action: 'wait_for', detail: text };
  }
  return { success: false, action: 'wait_for', error: 'Missing wait target' };
}

export async function executePressKey(context: Context, params: { key?: string }): Promise<ActionResult> {
  if (!params.key)
    return { success: false, action: 'press_key', error: 'Missing key' };
  await runTool(context, 'browser_press_key', { key: params.key });
  return { success: true, action: 'press_key', detail: params.key };
}

/**
 * Best-effort recovery when a primary intent fails: snapshot + retry click/type
 * with looser text matching, or navigate home of current origin.
 */
export async function executeRecovery(
  context: Context,
  intent: { action: string; parameters: Record<string, any>; fallbackStrategy?: string },
): Promise<ActionResult> {
  const strategy = intent.fallbackStrategy || 'auto_detect_elements';
  await runTool(context, 'browser_snapshot', {}).catch(() => undefined);

  switch (strategy) {
    case 'search_for_targets':
      if (intent.parameters.element)
        return executeClick(context, { element: intent.parameters.element });
      break;
    case 'analyze_page_context':
    case 'use_accessibility_tree':
    case 'auto_detect_elements':
    default:
      if (intent.action === 'click' && intent.parameters.element)
        return executeClick(context, { element: intent.parameters.element });
      if (intent.action === 'type' && intent.parameters.element && intent.parameters.text)
        return executeType(context, { element: intent.parameters.element, text: intent.parameters.text });
      if (intent.action === 'navigate' && intent.parameters.url)
        return executeNavigate(context, { url: intent.parameters.url });
      break;
  }

  return { success: false, action: 'recovery', error: `Recovery strategy '${strategy}' could not complete action` };
}
