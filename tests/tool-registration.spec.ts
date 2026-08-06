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
import { snapshotTools, visionTools } from '../src/tools.js';

test('2.1.1 registers evaluate and profile discovery in both browser modes', () => {
  for (const tools of [snapshotTools, visionTools]) {
    const names = tools.map(tool => tool.schema.name);
    expect(names).toContain('browser_evaluate');
    expect(names).toContain('browser_discover_profiles');
  }
});
