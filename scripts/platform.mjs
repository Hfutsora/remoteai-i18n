import fs from 'node:fs';
import { generateChromeResources } from './chrome.mjs';
import { inside } from './paths.mjs';

export function validatePlatformManifest(root, manifest) {
  const sources = [...(manifest.mirrors ?? []), ...(manifest.sections ?? [])];
  if (manifest.chrome) sources.push(manifest.chrome);
  for (const entry of sources) {
    const source = inside(root, entry.source);
    if (!fs.statSync(source).isFile()) throw new Error(`Missing platform source: ${entry.source}`);
  }
}

/** Platform tools consume generated copies at their required paths without runtime file access. */
export function generatePlatformResources({ root, hostRoot, manifest }, generated) {
  validatePlatformManifest(root, manifest);
  if (manifest.chrome) generateChromeResources({ root, hostRoot, config: manifest.chrome }, generated);
  const read = file => fs.readFileSync(inside(root, file), 'utf8').replace(/\r\n/g, '\n');
  for (const { source, target, notice: customNotice } of manifest.mirrors ?? []) {
    const notice = customNotice ?? `Generated from packages/i18n/${source}. Do not edit.`;
    const banner = target.endsWith('.json') ? ''
      : target.endsWith('.strings') ? `/* ${notice} */\n` : `// ${notice}\n`;
    generated.set(target, banner + read(source));
  }
  for (const { source, target, name } of manifest.sections ?? []) {
    const file = target;
    const content = generated.get(file)
      ?? fs.readFileSync(inside(hostRoot, target), 'utf8').replace(/\r\n/g, '\n');
    const pattern = new RegExp(`^([ \\t]*)// i18n:${name}:start\\n[\\s\\S]*?^\\1// i18n:${name}:end`, 'm');
    if (!pattern.test(content)) throw new Error(`Missing generated translation markers: ${target}/${name}`);
    generated.set(file, content.replace(pattern, (_, indent) => {
      const body = read(source).trimEnd().split('\n').map(line => indent + line).join('\n');
      return `${indent}// i18n:${name}:start\n${body}\n${indent}// i18n:${name}:end`;
    }));
  }
}
