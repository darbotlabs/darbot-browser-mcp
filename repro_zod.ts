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
import debug from 'debug';
import { zodToJsonSchema } from 'zod-to-json-schema';

const log = debug('darbot:repro:zod');

const schema = z.object({});

const jsonSchema = zodToJsonSchema(schema as any);
log(JSON.stringify(jsonSchema, null, 2));

const schema2 = z.object({
  element: z.string(),
  ref: z.string(),
});

const jsonSchema2 = zodToJsonSchema(schema2 as any);
log(JSON.stringify(jsonSchema2, null, 2));
