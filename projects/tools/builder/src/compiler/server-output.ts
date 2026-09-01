import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  commonStaticPrefix,
  type ServerFramePlan,
} from './server-plan.js';
import type {
  PublishedFrameArtifact,
} from './protected-artifacts.js';

export interface PublishedServerOutput {
  readonly indexPath: string;
}

export async function publishServerFrameOutput(
  plan: ServerFramePlan,
  serverRoot: string,
  publishedArtifacts:
    readonly PublishedFrameArtifact[],
): Promise<PublishedServerOutput> {
  const absoluteRoot =
    path.resolve(serverRoot);

  const temporaryRoot =
    `${absoluteRoot}.tmp-${process.pid}-${Date.now()}`;

  await fs.rm(
    temporaryRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await fs.mkdir(
    path.join(
      temporaryRoot,
      'shards',
    ),
    {
      recursive: true,
    },
  );

  const shardDescriptors: Array<{
    prefix: string;
    file: string;
  }> = [];

  for (const artifact of plan.artifacts) {
    const frames =
      plan.frames.filter(
        branch =>
          branch.frameSetId
            === artifact.frameSetId,
      );

    const shardFile =
      `shards/${safeFileName(artifact.frameSetId)}.json`;

    await fs.writeFile(
      path.join(
        temporaryRoot,
        shardFile,
      ),
      JSON.stringify(
        {
          version: 1,
          frames,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );

    shardDescriptors.push({
      prefix:
        commonStaticPrefix(frames),
      file:
        shardFile,
    });
  }

  const physicalByKey =
    new Map(
      publishedArtifacts.map(
        artifact => [
          artifact.artifactKey,
          artifact,
        ] as const,
      ),
    );

  const artifacts =
    plan.artifacts.map(
      artifact => {
        const physical =
          physicalByKey.get(
            artifact.artifactKey,
          );

        if (!physical) {
          throw new Error(
            `Protected artifact "${artifact.artifactKey}" was not published.`,
          );
        }

        return {
          kind: artifact.kind,
          artifactKey:
            artifact.artifactKey,
          frameSetId:
            artifact.frameSetId,
          slotId:
            artifact.slotId,
          frameIds:
            artifact.frameIds,
          dependencies:
            artifact.dependencies,
          branchIds:
            artifact.branchIds,
          file:
            portableRelative(
              absoluteRoot,
              physical.outputPath,
            ),
          hash:
            physical.hash,
          bytes:
            physical.bytes,
        };
      },
    );

  const index = {
    version: 1,
    generatedAt:
      new Date().toISOString(),
    shards:
      shardDescriptors.sort(
        (left, right) =>
          right.prefix.length
          - left.prefix.length,
      ),
    artifacts,
    generationHash:
      crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            shards:
              shardDescriptors,
            artifacts,
          }),
        )
        .digest('hex')
        .slice(0, 16),
  };

  await fs.writeFile(
    path.join(
      temporaryRoot,
      'server-index.json',
    ),
    JSON.stringify(
      index,
      null,
      2,
    ) + '\n',
    'utf8',
  );

  await fs.rm(
    absoluteRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await fs.rename(
    temporaryRoot,
    absoluteRoot,
  );

  return Object.freeze({
    indexPath:
      path.join(
        absoluteRoot,
        'server-index.json',
      ),
  });
}

function portableRelative(
  from: string,
  to: string,
): string {
  let relative =
    path.relative(from, to)
      .split(path.sep)
      .join('/');

  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }

  return relative;
}

function safeFileName(
  value: string,
): string {
  const normalized =
    value.replace(
      /[^A-Za-z0-9._-]+/g,
      '-',
    );

  return normalized || 'routes';
}