import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inside } from './paths.mjs';

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const files = root => git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  .split('\0').filter(Boolean);

/** Scan explicitly owned source submodules without taking ownership of independent applications. */
export function repositoryFiles(root, submodules = []) {
  const result = files(root);
  const links = new Set(git(root, ['ls-files', '--stage', '-z']).split('\0')
    .filter(entry => entry.startsWith('160000 ')).map(entry => entry.slice(entry.indexOf('\t') + 1)));
  for (const relative of submodules) {
    const directory = inside(root, relative);
    if (!links.has(relative)) continue; // Older hosts still track this directory's files directly.
    if (!fs.existsSync(path.join(directory, '.git'))) {
      throw new Error(`Initialize the owned source submodule: git submodule update --init ${relative}`);
    }
    result.push(...files(directory).map(file => `${relative}/${file}`));
  }
  return [...new Set(result)];
}
