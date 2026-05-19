/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Ambient declarations for internal Playwright bundles that we depend on but
 * which are not part of playwright-core's public TypeScript surface.
 *
 * Background: playwright-core 1.60+ tightened its exports map and removed
 * direct access to `playwright-core/lib/utils`. The same symbols are still
 * available via the always-exported `./lib/coreBundle` entry, namespaced
 * under `iso` (isomorphic helpers). We type only what we use.
 */

declare module 'playwright-core/lib/coreBundle' {
  /**
   * Isomorphic helpers re-exported from Playwright's internal bundle.
   * Only the members we actively consume are declared here. Extend as needed.
   */
  export const iso: {
    /**
     * Converts a resolved Playwright selector into a code-generator-style
     * locator expression (e.g. `getByRole('button', { name: 'Submit' })`).
     */
    asLocator(language: 'javascript' | 'python' | 'java' | 'csharp', selector: string): string;
  };
}
