import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { inside } from './paths.mjs';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function declarationSources(root) {
  const source = path.join(root, 'src');
  const staging = inside(root, 'dist/declaration-source');
  fs.rmSync(staging, { recursive: true, force: true });
  fs.cpSync(source, staging, { recursive: true });
  for (const file of walk(staging)) {
    if (file.endsWith('.json')) {
      // Typed JSON modules let consumers use declarations without resolveJsonModule or skipLibCheck.
      const json = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')));
      fs.writeFileSync(`${file}.ts`, `const value = ${json};\nexport default value;\n`);
    } else if (/\.tsx?$/.test(file)) {
      const content = fs.readFileSync(file, 'utf8').replace(/(from\s+|import\s*\()['"](\.[^'"]+\.json)['"]/g,
        (_, prefix, specifier) => `${prefix}'${specifier}.js'`);
      fs.writeFileSync(file, content);
    }
  }
}

/** Generate self-contained NodeNext-compatible declarations while keeping source exports unchanged. */
export function generateDeclarations({ root, destination }) {
  declarationSources(root);
  execFileSync(process.execPath, [createRequire(import.meta.url).resolve('typescript/bin/tsc'),
    '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit' });
  for (const file of walk(path.join(destination, 'types')).filter(file => file.endsWith('.d.ts'))) {
    const content = fs.readFileSync(file, 'utf8').replace(/(from\s+|import\s*\()['"](\.[^'"]+)['"]/g,
      (match, prefix, specifier) => {
        if (specifier.endsWith('.js')) return match;
        const target = path.resolve(path.dirname(file), specifier);
        const suffix = fs.existsSync(target + '.d.ts') ? '.js' : '/index.js';
        return `${prefix}'${specifier}${suffix}'`;
      });
    fs.writeFileSync(file, content);
  }
}
