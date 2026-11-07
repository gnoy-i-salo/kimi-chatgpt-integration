import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { affectedPackages, workspaces } from './workspace.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'kimi-chatgpt-integration-workspace-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const directory of ['apps', 'packages']) {
    mkdirSync(join(root, directory));
    writeFileSync(join(root, directory, '.gitkeep'), '');
  }
  return root;
}

test('empty workspace ignores .gitkeep and discovers the first real package', (t) => {
  const root = fixture(t);
  assert.deepEqual(workspaces(root), []);
  mkdirSync(join(root, 'packages/core'));
  writeFileSync(
    join(root, 'packages/core/package.json'),
    JSON.stringify({ name: '@kimi-chatgpt-integration/core' }),
  );
  assert.deepEqual(workspaces(root), [
    { name: '@kimi-chatgpt-integration/core', path: 'packages/core' },
  ]);
});

test('a package directory without its manifest fails instead of being silently skipped', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'apps/broken'));
  assert.throws(() => workspaces(root), /package.json/);
});

test('peer and optional dependents participate in transitive selection', () => {
  const packages = [
    { name: '@kimi-chatgpt-integration/core', path: 'packages/core' },
    {
      name: '@kimi-chatgpt-integration/plugin',
      path: 'packages/plugin',
      peerDependencies: { '@kimi-chatgpt-integration/core': 'workspace:*' },
    },
    {
      name: '@kimi-chatgpt-integration/web',
      path: 'apps/web',
      optionalDependencies: { '@kimi-chatgpt-integration/plugin': 'workspace:*' },
    },
  ];
  assert.equal(affectedPackages(packages, ['packages/core/src/deleted.ts']).length, 3);
});
