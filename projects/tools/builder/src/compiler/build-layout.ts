import path from 'node:path';

export interface SwitchboardBuildLayout {
  readonly root: string;
  readonly publicRoot: string;
  readonly protectedRoot: string;
  readonly metadataRoot: string;
  readonly manifest: string;
  readonly serverRoot: string;
}

export function createBuildLayout(
  outputPath: string,
): SwitchboardBuildLayout {
  const root = path.resolve(outputPath);
  const metadataRoot = path.join(
    root,
    '.switchboard',
  );

  return Object.freeze({
    root,
    publicRoot: path.join(
      root,
      'browser',
    ),
    protectedRoot: path.join(
      root,
      'protected',
    ),
    metadataRoot,
    manifest: path.join(
      metadataRoot,
      'manifest.json',
    ),
    serverRoot: path.join(
      metadataRoot,
      'server',
    ),
  });
}