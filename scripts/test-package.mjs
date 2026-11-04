import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { packageRoot } from './paths.mjs';

const metadata = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const archive = path.join(packageRoot, `dist/remoteai-i18n-${metadata.version}.tgz`);
assert.ok(fs.existsSync(archive), 'Run npm run pack:release before testing the package');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'remoteai-i18n-consumer-'));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run with npm run test:package');
try {
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(process.execPath, [npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund',
    '--package-lock=false', archive, 'typescript@5.6.3', 'react@18.3.1', 'react-dom@18.3.1', '@types/react@18.3.18'],
  { cwd: root, stdio: 'inherit' });
  const installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@remoteai/i18n/package.json'), 'utf8'));
  assert.equal(installed.version, metadata.version);
  const platformFiles = fs.readdirSync(path.join(root, 'node_modules/@remoteai/i18n/platform'), { recursive: true });
  assert.ok(platformFiles.every(file => !file.endsWith('.go')),
    'Go templates in node_modules must not become compilation units in a consuming Go module');
  const cli = path.join(root, 'node_modules/@remoteai/i18n', installed.bin['remoteai-i18n']);
  execFileSync(process.execPath, [cli, 'integrate', '--root', root, '--profile', 'admin'],
    { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, [cli, 'integrate', '--root', root, '--profile', 'admin', '--check'],
    { cwd: root, stdio: 'inherit' });
  assert.ok(fs.readFileSync(path.join(root, 'internal/devices/remote_command_messages.go'), 'utf8')
    .includes('Generated from @remoteai/i18n/'));
  fs.writeFileSync(path.join(root, 'runtime.mjs'), `
import assert from 'node:assert/strict';
import { createI18n } from '@remoteai/i18n';
import { loadResource } from '@remoteai/i18n/loader';
import { resources } from '@remoteai/i18n/common';
import { I18nProvider } from '@remoteai/i18n/react';
import { dreamSkinCopy } from '@remoteai/i18n/tooling/dream-skin';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const i18n = createI18n({ locale: 'ja', resources });
assert.equal(i18n.t('common.actions.copy'), 'コピー');
const lazy = createI18n({ locale: 'ja', loadResource });
await lazy.load('ja', ['common', 'desktop']);
assert.equal(lazy.t('downloads.title'), 'ダウンロード');
assert.equal(dreamSkinCopy('natureAlpineGlow').nameEn, 'Alpine Glow');
assert.equal(renderToStaticMarkup(createElement(I18nProvider, { instance: i18n }, 'ok')), 'ok');
for (const [entry, target] of ${JSON.stringify(Object.entries(installed.exports))}) {
  const name = '@remoteai/i18n' + (entry === '.' ? '' : entry.slice(1));
  await import(name, typeof target === 'string' && target.endsWith('.json') ? { with: { type: 'json' } } : undefined);
}
console.log('Published ESM, lazy resources, public entries, React and tooling passed');
`);
  execFileSync(process.execPath, ['runtime.mjs'], { cwd: root, stdio: 'inherit' });
  fs.writeFileSync(path.join(root, 'types.ts'), `
import { createI18n } from '@remoteai/i18n';
import { resources } from '@remoteai/i18n/common';
const app = createI18n({ locale: 'en', resources });
app.t('common.actions.copy');
app.t('client.conversation.manageProject', { value1: 'example' });
// @ts-expect-error Unknown semantic keys must remain rejected.
app.t('missing.public.key');
// @ts-expect-error Required interpolation parameters must remain required.
app.t('client.conversation.manageProject');
`);
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict',
    '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', 'types.ts'],
  { cwd: root, stdio: 'inherit' });
} finally {
  // This exact temporary directory is created above, outside any user's checkout.
  fs.rmSync(root, { recursive: true, force: true });
}
