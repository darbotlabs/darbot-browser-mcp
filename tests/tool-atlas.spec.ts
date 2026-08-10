/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

import { test, expect } from '@playwright/test';
import { allTools } from '../src/tools.js';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

test('tool atlas is complete and links every registered tool to source', () => {
  const atlasPath = path.resolve('tool-atlas.csv');
  const lines = fs.readFileSync(atlasPath, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const toolNameIndex = headers.indexOf('tool_name');
  const sourceScriptIndex = headers.indexOf('source_script');

  expect(toolNameIndex).toBeGreaterThanOrEqual(0);
  expect(sourceScriptIndex).toBeGreaterThanOrEqual(0);
  expect(lines).toHaveLength(allTools.length + 1);

  const records = lines.slice(1).map(parseCsvLine);
  const names = records.map(record => record[toolNameIndex]);
  expect(new Set(names).size).toBe(allTools.length);
  for (const tool of allTools)
    expect(names).toContain(tool.schema.name);

  for (const record of records) {
    const sourceScript = record[sourceScriptIndex];
    expect(fs.existsSync(path.resolve(sourceScript))).toBe(true);
  }
});
