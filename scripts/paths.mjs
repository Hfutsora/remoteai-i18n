import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));

/** Host integrations must never write through a relative path or symlink outside the selected root. */
export function inside(root, relative) {
  const base = path.resolve(root);
  const target = path.resolve(base, relative);
  const child = path.relative(base, target);
  if (!child || child.startsWith(`..${path.sep}`) || child === '..' || path.isAbsolute(child)) {
    throw new Error(`Path must stay inside its root: ${relative}`);
  }
  let existing = base;
  for (const segment of child.split(path.sep)) {
    existing = path.join(existing, segment);
    let entry;
    try { entry = fs.lstatSync(existing); } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
    // lstat also detects junctions that Windows refuses to follow through existsSync/realpath.
    if (entry.isSymbolicLink()) throw new Error(`Path may resolve outside its root through a link: ${relative}`);
  }
  return target;
}

export function integrationOptions(args = process.argv.slice(2)) {
  const options = { check: false, root: undefined, manifest: path.join(packageRoot, 'platform.json') };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--check') options.check = true;
    else if (['--root', '--manifest'].includes(flag) && args[index + 1]) {
      options[flag.slice(2)] = path.resolve(args[++index]);
    } else throw new Error(`Unknown or incomplete option: ${flag}`);
  }
  if (!options.root || !fs.statSync(options.root).isDirectory()) {
    throw new Error('Pass --root with the application repository directory.');
  }
  return options;
}

export function writeGenerated(root, generated, check) {
  const errors = [];
  for (const [file, content] of generated) {
    const absolute = inside(root, file);
    const actual = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n') : undefined;
    if (actual === content) continue;
    if (check) { errors.push(`Outdated generated file: ${file}`); continue; }
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  if (errors.length) throw new Error(errors.join('\n'));
}
