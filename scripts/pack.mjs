import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { packageRoot } from './paths.mjs';

await import('./build.mjs');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this command with npm run pack:release.');
const output = execFileSync(process.execPath, [npm, 'pack', './dist/package', '--pack-destination', 'dist', '--json'],
  { cwd: packageRoot, encoding: 'utf8' });
const [{ filename }] = JSON.parse(output);
const checksum = createHash('sha256').update(fs.readFileSync(path.join(packageRoot, 'dist', filename))).digest('hex');
fs.writeFileSync(path.join(packageRoot, 'dist/SHA256SUMS'), `${checksum}  ${filename}\n`);
console.log(`Packed ${filename} (${checksum})`);
