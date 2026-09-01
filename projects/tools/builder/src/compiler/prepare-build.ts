import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  SwitchboardAnalysis,
} from './analyze.js';
import {
  publishServerFrameOutput,
} from './server-output.js';
import {
  createHostRoutesSource,
  rootFrameSlotIds,
} from './host-routes-entry.js';
import {
  createHostResolverSource,
} from './host-resolver-entry.js';
import {
  buildProtectedFrameArtifacts,
  publishProtectedFrameArtifacts,
  removeStaleProtectedFrameArtifacts,
} from './protected-artifacts.js';

export interface PrepareBuildOptions {
  readonly metadataRoot: string;
}

export interface PreparedSwitchboardBuild {
  readonly host: {
    readonly routesEntry: string;
    readonly resolverEntry: string;
  };

  publish(): Promise<{
    readonly success: boolean;
    readonly diagnostics: readonly {
      readonly level: 'error' | 'warning' | 'info';
      readonly code?: string;
      readonly message: string;
    }[];
  }>;

  rollback(): Promise<void>;
  dispose(): Promise<void>;
}


export async function prepareBuild(
  analysis: SwitchboardAnalysis,
  options: PrepareBuildOptions,
): Promise<PreparedSwitchboardBuild> {
  if (
    !analysis.success
    || !analysis.plan
  ) {
    throw new Error(
      'Cannot prepare Switchboard build from failed analysis.',
    );
  }

  const metadataRoot =
    path.resolve(
      options.metadataRoot,
    );

  const hostRoot =
    path.join(
      metadataRoot,
      'host',
    );

  const routesEntry =
    path.join(
      hostRoot,
      'routes.ts',
    );
  const resolverEntry =
    path.join(
      hostRoot,
      'resolver.ts',
    );


  await fs.mkdir(
    hostRoot,
    {
      recursive: true,
    },
  );

  /*
   * Prepare protected artifacts before delegating to Angular. Publication
   * still happens only after the public host build succeeds.
   */
  const preparedArtifacts =
    await buildProtectedFrameArtifacts(
      analysis,
    );

  /*
   * Keep the browser host frame source minimal. The protected contribution
   * modules are deliberately absent from the initial application build.
   */
  await fs.writeFile(
    routesEntry,
    createHostRoutesSource(
      rootFrameSlotIds(analysis.snapshot?.rootRoutes ?? []),
    ),
    'utf8',
  );

  await fs.writeFile(
    resolverEntry,
    createHostResolverSource(
      preparedArtifacts.hostModules,
    ),
    'utf8',
  );


  return Object.freeze({
    host: Object.freeze({
      routesEntry,
      resolverEntry,
    }),

    async publish() {
      const publishedArtifacts =
        await publishProtectedFrameArtifacts(
          analysis.planned.artifactsOutput,
          preparedArtifacts.artifacts,
        );

      /*
       * The old server index remains valid while the new content-hashed files
       * are added. Only after every file is present do we atomically swap the
       * server metadata to the new generation.
       */
      await publishServerFrameOutput(
        analysis.plan!,
        analysis.planned.serverOutput,
        publishedArtifacts,
      );

      await removeStaleProtectedFrameArtifacts(
        analysis.planned.artifactsOutput,
        publishedArtifacts,
      );

      if (
        analysis.planned
          .buildManifestOutput
      ) {
        await fs.mkdir(
          path.dirname(
            analysis.planned
              .buildManifestOutput,
          ),
          {
            recursive: true,
          },
        );

        await fs.writeFile(
          analysis.planned
            .buildManifestOutput,
          JSON.stringify(
            {
              version: 1,
              entry:
                analysis.planned.entry,
              frameSets:
                analysis.plan!.artifacts.map(
                  artifact => ({
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
                    frames:
                      artifact.branchIds,
                    file:
                      publishedArtifacts.find(
                        item =>
                          item.artifactKey
                          === artifact.artifactKey,
                      )?.fileName,
                    hash:
                      publishedArtifacts.find(
                        item =>
                          item.artifactKey
                          === artifact.artifactKey,
                      )?.hash,
                  }),
                ),
            },
            null,
            2,
          ) + '\n',
          'utf8',
        );
      }

      return {
        success: true,
        diagnostics: [],
      };
    },

    async rollback() {},
    async dispose() {},
  });
}