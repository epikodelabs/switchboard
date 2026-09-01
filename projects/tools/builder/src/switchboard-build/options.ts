import path from 'node:path';

export interface SwitchboardOptions {
  readonly entry?: string;
  readonly profile?: boolean;
  readonly buildManifest?: boolean;
}

export interface ResolvedSwitchboardOptions {
  readonly entry: string;
  readonly profile: boolean;
  readonly buildManifest: boolean;
}

export function resolveSwitchboardOptions(
  projectRoot: string,
  options: SwitchboardOptions | undefined,
): ResolvedSwitchboardOptions {
  return Object.freeze({
    entry: path.join(
      projectRoot,
      options?.entry ?? 'src/app/app.routes.ts',
    ),
    profile: options?.profile ?? false,
    buildManifest: options?.buildManifest ?? true,
  });
}