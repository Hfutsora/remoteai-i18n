import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { integrationOptions, inside, writeGenerated } from '../scripts/paths.mjs';
import { generatePlatformResources } from '../scripts/platform.mjs';

const temporary = [];
const directory = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'remoteai-i18n-'));
  temporary.push(root);
  return root;
};
afterEach(() => temporary.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })));

it('requires an explicit host root and rejects escaping paths, including directory junctions', () => {
  const root = directory();
  const outside = directory();
  expect(() => integrationOptions([])).toThrow('Pass --root');
  expect(() => inside(root, '../escape')).toThrow('inside');
  fs.symlinkSync(outside, path.join(root, 'linked'), 'junction');
  expect(() => inside(root, 'linked/file')).toThrow('outside');
  expect(integrationOptions(['--root', root, '--profile', 'admin']).manifest).toMatch(/integrations[\\/]admin.json$/);
  expect(() => integrationOptions(['--root', root, '--profile', '../escape'])).toThrow('Invalid integration profile');
});

it('generates mirrors and embedded sections in the selected consumer while checking drift', () => {
  const root = directory();
  const hostRoot = directory();
  fs.writeFileSync(path.join(root, 'copy.js'), 'export const label = "Translated";\n');
  fs.writeFileSync(path.join(hostRoot, 'host.js'), '// code\n// i18n:copy:start\nold\n// i18n:copy:end\n');
  const manifest = { mirrors: [{ source: 'copy.js', target: 'mirror.js' }],
    sections: [{ source: 'copy.js', target: 'host.js', name: 'copy' }] };
  const generated = new Map();
  generatePlatformResources({ root, hostRoot, manifest }, generated);
  expect(() => writeGenerated(hostRoot, generated, true)).toThrow('Outdated');
  writeGenerated(hostRoot, generated, false);
  expect(fs.readFileSync(path.join(hostRoot, 'host.js'), 'utf8')).toContain('// code\n// i18n:copy:start');
  expect(() => writeGenerated(hostRoot, generated, true)).not.toThrow();
  expect(fs.existsSync(path.join(root, 'mirror.js'))).toBe(false);
});

it('keeps the application ownership guard active for custom independent consumer layouts', () => {
  const root = directory();
  execFileSync('git', ['init', '--quiet', root]);
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src/screen.tsx'), 'const screen = <button>保存</button>;');
  const config = path.join(root, 'i18n.json');
  fs.writeFileSync(config, JSON.stringify({ ownership: { include: ['src'], exclude: [] } }));
  const args = [fileURLToPath(new URL('../scripts/check-usage.mjs', import.meta.url)),
    '--root', root, '--manifest', config];
  expect(() => execFileSync(process.execPath, args.map(String), { stdio: 'pipe' })).toThrow();
  fs.writeFileSync(path.join(root, 'src/screen.tsx'), 'const screen = <button>{t("common.actions.save")}</button>;');
  expect(() => execFileSync(process.execPath, args.map(String), { stdio: 'pipe' })).not.toThrow();
});
