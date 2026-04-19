import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig } from '../src/agent/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configsDir = resolve(__dirname, '../public/configs');

const files = ['shadowed.conf', 'leaky-vlan.conf', 'clean.conf'];

for (const file of files) {
  const text = readFileSync(resolve(configsDir, file), 'utf-8');
  const parsed = parseConfig(text);
  console.log(`=== ${file} ===`);
  console.log(JSON.stringify(parsed, null, 2));
}
