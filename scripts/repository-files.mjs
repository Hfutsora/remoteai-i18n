import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inside } from './paths.mjs';

const MAX_GIT_OUTPUT_BYTES = 16 * 1024 * 1024;
const git = (root, args) => execFileSync('git', args, {
  cwd: root, encoding: 'utf8', maxBuffer: MAX_GIT_OUTPUT_BYTES,
});
const files = root => git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  .split('\0').filter(Boolean);

/** Scan explicitly owned source submodules without taking ownership of independent applications. */
export function repositoryFiles(root, submodules = []) {
  const result = files(root);
  if (!submodules.length) return [...new Set(result)];
  const directories = submodules.map(relative => [relative, inside(root, relative)]);
  const links = new Set(git(root, ['ls-files', '--stage', '-z', '--', ...submodules]).split('\0')
    .filter(entry => entry.startsWith('160000 ')).map(entry => entry.slice(entry.indexOf('\t') + 1)));
  for (const [relative, directory] of directories) {
    if (!links.has(relative)) continue; // Older hosts still track this directory's files directly.
    if (!fs.existsSync(path.join(directory, '.git'))) {
      throw new Error(`Initialize the owned source submodule: git submodule update --init ${relative}`);
    }
    result.push(...files(directory).map(file => `${relative}/${file}`));
  }
  return [...new Set(result)];
}
