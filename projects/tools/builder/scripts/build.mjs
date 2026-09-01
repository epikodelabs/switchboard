import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const packageRoot = path.resolve(import.meta.dirname, '..');
const sourceEntry = path.join(packageRoot, 'src', 'switchboard-build', 'index.ts');
const outputRoot = path.join(packageRoot, 'dist');
const outputFile = path.join(outputRoot, 'switchboard-build', 'index.cjs');

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(path.dirname(outputFile), { recursive: true });
await build({
  entryPoints: [sourceEntry],
  outfile: outputFile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  packages: 'external',
  sourcemap: true,
  sourcesContent: true,
  logLevel: 'info',
});
console.log(`Built Switchboard builder: ${path.relative(process.cwd(), outputFile)}`);
