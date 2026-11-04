import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { packageRoot, inside } from './paths.mjs';
import { generateDeclarations } from './declarations.mjs';

const root = packageRoot;
const destination = path.join(root, 'dist/package');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function publicEntries() {
  const files = walk(path.join(root, 'src')).map(file => './' + path.relative(root, file).replaceAll('\\', '/'));
  const entries = [];
  for (const [key, target] of Object.entries(metadata.exports)) {
    if (!target.includes('*')) { entries.push([key, target]); continue; }
    const [prefix, suffix] = target.split('*');
    for (const file of files.filter(file => file.startsWith(prefix) && file.endsWith(suffix))) {
      entries.push([key.replace('*', file.slice(prefix.length, -suffix.length)), file]);
    }
  }
  return entries;
}

function releaseManifest(entries) {
  const exports = Object.fromEntries(entries.map(([key, target]) => {
    if (!/\.tsx?$/.test(target)) return [key, target];
    const relative = target.replace(/^\.\/src\//, '').replace(/\.tsx?$/, '');
    return [key, { types: `./types/${relative}.d.ts`, import: `./js/${relative}.js`, default: `./js/${relative}.js` }];
  }));
  const { scripts, devDependencies, private: privatePackage, ...published } = metadata;
  return { ...published, bin: { 'remoteai-i18n': 'scripts/cli.mjs' },
    exports, types: './types/index.d.ts', main: './js/index.js' };
}

execFileSync(process.execPath, ['scripts/generate.mjs', '--check'], { cwd: root, stdio: 'inherit' });
// Only this script's verified output directory may be replaced.
const output = inside(root, 'dist/package');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of ['src', 'platform', 'integrations', 'scripts', 'tooling', 'languages.json', 'catalogs.json', 'platform.json',
  'README.md', 'LICENSE']) {
  fs.cpSync(path.join(root, file), path.join(destination, file), { recursive: true });
}
const entries = publicEntries();
const entryPoints = Object.fromEntries(entries.filter(([, file]) => /\.tsx?$/.test(file))
  .map(([, file]) => [file.replace(/^\.\/src\//, '').replace(/\.tsx?$/, ''), path.join(root, file)]));
await build({ entryPoints, outdir: path.join(destination, 'js'), bundle: true, splitting: true,
  format: 'esm', platform: 'neutral', target: 'es2022', jsx: 'automatic', packages: 'external' });
generateDeclarations({ root, destination });
fs.writeFileSync(path.join(destination, 'package.json'), JSON.stringify(releaseManifest(entries), null, 2) + '\n');
console.log(`Built ${metadata.name}@${metadata.version} with ${entries.length} public entries`);
