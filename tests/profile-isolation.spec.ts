/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { browserListProfiles } from '../src/tools/profiles.js';

import type { Context } from '../src/context.js';

function profile(name: string) {
  return {
    version: '2.0',
    type: 'darbot-session-state',
    edgeProfile: { name: 'default' },
    name,
    description: '',
    created: '2026-08-10T00:00:00.000Z',
    url: 'https://example.com',
    title: name,
  };
}

async function writeProfile(root: string, namespace: string, name: string): Promise<void> {
  const namespaceHash = crypto.createHash('sha256').update(namespace).digest('hex').slice(0, 32);
  const profileDir = path.join(root, 'principals', namespaceHash, name);
  await fs.promises.mkdir(profileDir, { recursive: true });
  await fs.promises.writeFile(path.join(profileDir, 'profile.json'), JSON.stringify(profile(name)));
}

test('authenticated principals list only their own saved session states', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'darbot-profile-isolation-'));
  const previousDir = process.env.DARBOT_SESSION_STATE_DIR;
  process.env.DARBOT_SESSION_STATE_DIR = root;
  try {
    await writeProfile(root, 'principal:alpha', 'alpha-state');
    await writeProfile(root, 'principal:beta', 'beta-state');

    const alphaContext = { storageNamespace: () => 'principal:alpha' } as Context;
    const betaContext = { storageNamespace: () => 'principal:beta' } as Context;
    const alphaResult = await browserListProfiles.handle(alphaContext, {});
    const betaResult = await browserListProfiles.handle(betaContext, {});
    const alphaText = (alphaResult.resultOverride!.content[0] as { text: string }).text;
    const betaText = (betaResult.resultOverride!.content[0] as { text: string }).text;

    expect(alphaText).toContain('alpha-state');
    expect(alphaText).not.toContain('beta-state');
    expect(betaText).toContain('beta-state');
    expect(betaText).not.toContain('alpha-state');
  } finally {
    if (previousDir === undefined)
      delete process.env.DARBOT_SESSION_STATE_DIR;
    else
      process.env.DARBOT_SESSION_STATE_DIR = previousDir;
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
