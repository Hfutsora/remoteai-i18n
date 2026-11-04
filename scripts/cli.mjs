#!/usr/bin/env node

const commands = { generate: './generate.mjs', integrate: './integrate.mjs', scan: './check-usage.mjs' };
const command = process.argv.splice(2, 1)[0];
if (!Object.hasOwn(commands, command)) {
  throw new Error('Usage: remoteai-i18n <generate|integrate|scan> [--root <application>] [--check]');
}
await import(commands[command]);
