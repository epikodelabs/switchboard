import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const output = path.resolve('dist/templates');
await mkdir(output, { recursive: true });
await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
  'pack',
  './templates/server-node-ts',
  '--pack-destination',
  output,
]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${command} exited with code ${code}.`)));
  });
}
