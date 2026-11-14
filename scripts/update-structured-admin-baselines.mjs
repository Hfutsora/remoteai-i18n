import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const resource = await build({ stdin: { contents:
  `import en from './src/copy/admin/en'; import zh from './src/copy/admin/zh';
   import ru from './src/copy/admin/ru'; export default { adminEn: en, adminZh: zh, adminRu: ru };`,
  resolveDir: decodeURIComponent(root.pathname.replace(/^\/([A-Z]:)/i, '$1')) },
  bundle: true, write: false, format: 'esm', platform: 'node' });
const { default: tables } = await import(`data:text/javascript;base64,${Buffer.from(resource.outputFiles[0].text).toString('base64')}`);
const path = new URL('tests/structured-baselines.json', root);
const baseline = JSON.parse(await readFile(path, 'utf8'));
for (const [name, table] of Object.entries(tables)) {
  const ordered = Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b, 'en')));
  baseline[name] = createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}
await writeFile(path, JSON.stringify(baseline, null, 2) + '\n');
