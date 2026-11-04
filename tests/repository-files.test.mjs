import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { repositoryFiles } from '../scripts/repository-files.mjs';

const temporary = [];
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-owned-submodule-'));
  temporary.push(root);
  git(root, ['init', '--quiet']);
  const child = path.join(root, 'shared');
  fs.mkdirSync(child);
  git(child, ['init', '--quiet']);
  fs.writeFileSync(path.join(child, 'tracked.ts'), 'export const value = 1;');
  git(child, ['add', 'tracked.ts']);
  git(child, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture']);
  const revision = git(child, ['rev-parse', 'HEAD']);
  git(root, ['update-index', '--add', '--cacheinfo', `160000,${revision},shared`]);
  return { root, child };
}
afterEach(() => temporary.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })));

it('includes tracked and new shared files only when the integration owns that submodule', () => {
  const { root, child } = fixture();
  fs.writeFileSync(path.join(child, 'new.ts'), 'export const value = 2;');
  fs.writeFileSync(path.join(child, '.gitignore'), 'ignored.ts\n');
  fs.writeFileSync(path.join(child, 'ignored.ts'), 'ignored');
  expect(repositoryFiles(root)).not.toContain('shared/tracked.ts');
  expect(repositoryFiles(root, ['shared'])).toEqual(expect.arrayContaining(['shared/tracked.ts', 'shared/new.ts']));
  expect(repositoryFiles(root, ['shared'])).not.toContain('shared/ignored.ts');
});

it('fails visibly when an owned submodule is missing instead of silently skipping its copy', () => {
  const { root, child } = fixture();
  fs.renameSync(path.join(child, '.git'), path.join(child, 'hidden-git'));
  expect(() => repositoryFiles(root, ['shared'])).toThrow('git submodule update --init shared');
  expect(() => repositoryFiles(root, ['../outside'])).toThrow('inside');
});

it('also supports hosts that still track shared sources in the parent', () => {
  const { root } = fixture();
  git(root, ['update-index', '--force-remove', 'shared']);
  const normal = path.join(root, 'normal');
  fs.mkdirSync(normal);
  fs.writeFileSync(path.join(normal, 'source.ts'), 'export {};');
  expect(repositoryFiles(root, ['normal'])).toContain('normal/source.ts');
});

it('rejects untranslated UI in a new shared file through the actual ownership scanner', () => {
  const { root, child } = fixture();
  const source = path.join(child, 'new.tsx');
  fs.writeFileSync(source, 'const screen = <button>保存</button>;');
  const manifest = path.join(root, 'i18n.json');
  fs.writeFileSync(manifest, JSON.stringify({
    ownership: { include: ['shared'], exclude: [], submodules: ['shared'] },
  }));
  const args = [fileURLToPath(new URL('../scripts/check-usage.mjs', import.meta.url)),
    '--root', root, '--manifest', manifest];
  expect(() => execFileSync(process.execPath, args, { stdio: 'pipe' })).toThrow();
  fs.writeFileSync(source, 'const screen = <button>{t("common.actions.save")}</button>;');
  expect(() => execFileSync(process.execPath, args, { stdio: 'pipe' })).not.toThrow();
});
