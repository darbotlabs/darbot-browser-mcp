#!/usr/bin/env node
// @ts-check

export const copyrightHeader = `/**
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
 */`;

function usage() {
  console.log(`Usage: node utils/copyright.js [--check]

Prints the standard DarbotLabs Apache-2.0 source header.

Options:
  --check   Verify this utility can generate the header.
  --help    Show this help.`);
}

const args = new Set(process.argv.slice(2));
if (args.has('--help') || args.has('-h')) {
  usage();
  process.exit(0);
}

if (args.has('--check'))
  process.exit(copyrightHeader.includes('Apache License') ? 0 : 1);

console.log(copyrightHeader);
