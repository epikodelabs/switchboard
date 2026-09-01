#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(packageRoot, 'template');
const target = path.resolve(process.cwd(), process.argv[2] ?? 'switchboard-server');

try {
  await fs.access(target);
  const entries = await fs.readdir(target);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${target}`);
  }
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    await fs.mkdir(target, { recursive: true });
  } else if (error instanceof Error && error.message.startsWith('Target directory')) {
    throw error;
  }
}

await fs.cp(source, target, { recursive: true });
console.log(`Created Switchboard Node server template in ${target}`);
