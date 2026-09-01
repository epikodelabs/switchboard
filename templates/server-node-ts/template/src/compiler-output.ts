import fs from 'node:fs/promises';
import path from 'node:path';

import { createSnapshotSource } from './switchboard-server/public-api.js';
import type {
  ServerFrameIndex,
  ServerFrameShard,
} from './switchboard-server/public-api.js';

export const outputRoot = path.resolve(
  process.env['SWITCHBOARD_OUTPUT_ROOT'] ?? 'dist/app/.switchboard/server',
);
const indexPath = path.join(outputRoot, 'server-index.json');

export function resolveServerOutputPath(relative: string): string {
  const absolute = path.resolve(outputRoot, relative);
  const relation = path.relative(outputRoot, absolute);
  if (relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    throw new Error(`Compiler output path ${JSON.stringify(relative)} escapes ${JSON.stringify(outputRoot)}.`);
  }
  return absolute;
}

export function resolveProtectedArtifactPath(relative: string, protectedRoot: string): string {
  const absolute = path.resolve(outputRoot, relative);
  const root = path.resolve(protectedRoot);
  const relation = path.relative(root, absolute);
  if (relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    throw new Error(`Protected artifact path ${JSON.stringify(relative)} escapes ${JSON.stringify(root)}.`);
  }
  return absolute;
}

async function loadIndex(): Promise<ServerFrameIndex> {
  return readJson<ServerFrameIndex>(indexPath);
}

async function loadShard(file: string): Promise<ServerFrameShard> {
  return readJson<ServerFrameShard>(resolveServerOutputPath(file));
}

async function revision(): Promise<string> {
  const stat = await fs.stat(indexPath, { bigint: true });
  return `${stat.mtimeNs}:${stat.size}`;
}

export const compilerOutputSource = createSnapshotSource({ loadIndex, loadShard, revision });

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as T;
}
