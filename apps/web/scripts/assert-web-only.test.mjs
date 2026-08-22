import assert from 'node:assert/strict';
import test from 'node:test';
import { findForbidden } from './assert-web-only.mjs';

test('detects a legacy desktop path in active source', () => {
  assert.deepEqual(findForbidden("import { safeInvoke } from './tauri';", 'fixture.ts'), ['fixture.ts: Tauri bridge']);
});

test('accepts browser-safe source', () => {
  assert.deepEqual(findForbidden('fetch("/v1/me");', 'fixture.ts'), []);
});
