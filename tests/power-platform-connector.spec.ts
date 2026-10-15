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

import { expect, test } from '@playwright/test';

import { allTools } from '../src/tools.js';

interface ConnectorOperation {
  responses?: Record<string, {
    schema?: {
      $ref?: string;
    };
  }>;
}

interface ConnectorDefinition {
  basePath: string;
  paths: Record<string, Record<string, ConnectorOperation>>;
  definitions: Record<string, {
    type?: string;
  }>;
}

test('Power Platform connector covers every tool and models gateway failures', () => {
  const definitionPath = path.resolve('power-platform', 'connector', 'apiDefinition.swagger.json');
  const definition = JSON.parse(fs.readFileSync(definitionPath, 'utf8')) as ConnectorDefinition;

  expect(definition.basePath).toBe('/api/v1');
  expect(Object.keys(definition.paths)).toHaveLength(allTools.length + 7);
  expect(definition.definitions.ToolResponse?.type).toBe('object');
  expect(definition.definitions.GatewayErrorResponse?.type).toBe('string');

  for (const tool of allTools)
    expect(definition.paths[`/tools/${tool.schema.name}`]?.post).toBeTruthy();

  const operations = Object.values(definition.paths)
      .flatMap(pathItem => Object.values(pathItem))
      .filter(operation => operation.responses);
  expect(operations).toHaveLength(allTools.length + 7);
  for (const operation of operations) {
    expect(operation.responses?.['502']?.schema?.$ref)
        .toBe('#/definitions/GatewayErrorResponse');
  }
});
