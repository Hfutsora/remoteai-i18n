import fs from 'node:fs';
import { generatePlatformResources } from './platform.mjs';
import { integrationOptions, packageRoot, writeGenerated } from './paths.mjs';

const options = integrationOptions();
const manifest = JSON.parse(fs.readFileSync(options.manifest, 'utf8'));
const generated = new Map();
generatePlatformResources({ root: packageRoot, hostRoot: options.root, manifest }, generated);
writeGenerated(options.root, generated, options.check);
console.log(`i18n: ${options.check ? 'verified' : 'generated'} ${generated.size} application platform files`);
