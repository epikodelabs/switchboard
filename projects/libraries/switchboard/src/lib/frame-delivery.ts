import type {
  FrameContributionDefinition,
} from './navigation-definitions';

export interface ServerFrameArtifactDelivery {
  readonly artifactKey: string;
  readonly moduleUrl: string;
  readonly hash: string;
  readonly slotId: string;
}

export interface ServerFrameResolution {
  readonly artifactKey: string;
  readonly artifacts: readonly ServerFrameArtifactDelivery[];
}

export interface ServerFrameFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type ServerFrameFetch = (
  input: string,
  init: Readonly<{
    readonly credentials: 'same-origin';
    readonly headers: Readonly<Record<string, string>>;
    readonly signal?: AbortSignal;
  }>,
) => Promise<ServerFrameFetchResponse>;

export type ServerFrameModuleImporter = (moduleUrl: string) => Promise<unknown>;
export type ServerFrameHostModule = Readonly<Record<string, unknown>>;
export type ServerFrameHostModules = Readonly<Record<string, ServerFrameHostModule>>;

const SWITCHBOARD_SERVER_HOST_RUNTIME_GLOBAL_KEY =
  '__SWITCHBOARD_SERVER_NAVIGATION_HOST_RUNTIME_V1__';

type RuntimeGlobal = typeof globalThis & {
  [SWITCHBOARD_SERVER_HOST_RUNTIME_GLOBAL_KEY]?: {
    readonly version: 1;
    readonly modules: Map<string, ServerFrameHostModule>;
  };
};

/**
 * Registers host module identities for independently delivered frame artifacts.
 * Registration is deliberately lazy: an application that never navigates to a
 * protected frame need not initialize a delivery runtime.
 */
export function registerServerFrameHostModules(modules: ServerFrameHostModules): void {
  const global = globalThis as RuntimeGlobal;
  let runtime = global[SWITCHBOARD_SERVER_HOST_RUNTIME_GLOBAL_KEY];
  if (!runtime) {
    runtime = { version: 1, modules: new Map<string, ServerFrameHostModule>() };
    global[SWITCHBOARD_SERVER_HOST_RUNTIME_GLOBAL_KEY] = runtime;
  }
  for (const [specifier, module] of Object.entries(modules)) {
    const normalized = specifier.trim();
    if (!normalized) throw new Error('Server frame host module specifier must not be empty.');
    const existing = runtime.modules.get(normalized);
    if (existing && existing !== module) {
      throw new Error(`Server frame host module ${JSON.stringify(normalized)} was registered with a different module identity.`);
    }
    runtime.modules.set(normalized, module);
  }
}

export interface ServerFrameResolverOptions {
  readonly endpoint?: string;
  readonly fetch?: ServerFrameFetch;
  readonly importModule?: ServerFrameModuleImporter;
  readonly hostModules?: ServerFrameHostModules;
  /** Re-fetch the delivery plan when a published artifact became stale. */
  readonly artifactRefreshRetries?: number;
}

export interface ServerFrameResolverContext {
  readonly signal?: AbortSignal;
}

export interface ServerResolvedFrameConfiguration {
  readonly contributions: readonly FrameContributionDefinition[];
  readonly contributionIdentities: Readonly<Record<string, string>>;
}

export type ServerFrameResolver = (
  url: URL,
  context?: ServerFrameResolverContext,
) => Promise<ServerResolvedFrameConfiguration | null>;

export function createServerFrameResolver(
  options: ServerFrameResolverOptions = {},
): ServerFrameResolver {
  if (options.hostModules) registerServerFrameHostModules(options.hostModules);

  const endpoint = normalizeEndpoint(options.endpoint ?? '/api/navigation/resolve');
  const fetchFrames = options.fetch ?? defaultServerFrameFetch;
  const usesNativeImport = !options.importModule;
  const importModule = options.importModule ?? defaultServerFrameImport;
  const loaded = new Map<string, Promise<FrameContributionDefinition>>();
  const latestIdentityByArtifact = new Map<string, string>();
  const retries = normalizeRetryCount(options.artifactRefreshRetries ?? 1);

  const resolveOnce = async (url: URL, context: ServerFrameResolverContext) => {
    throwIfAborted(context.signal);
    const path = `${url.pathname}${url.search}${url.hash}`;
    const response = await fetchFrames(
      resolutionRequestUrl(endpoint, path),
      {
        credentials: 'same-origin',
        headers: Object.freeze({ Accept: 'application/json' }),
        signal: context.signal,
      },
    );
    throwIfAborted(context.signal);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to resolve frame graph for "${path}": ${response.status}.`);
    const payload = await response.json();
    throwIfAborted(context.signal);
    if (!isServerFrameResolution(payload)) {
      throw new Error(`Server returned an invalid Switchboard frame resolution for "${path}".`);
    }

    const contributions: FrameContributionDefinition[] = [];
    const identities: Record<string, string> = {};
    for (const descriptor of payload.artifacts) {
      const identity = `${descriptor.artifactKey}:${descriptor.hash}:${descriptor.moduleUrl}`;
      let pending = loaded.get(identity);
      if (!pending) {
        const previous = latestIdentityByArtifact.get(descriptor.artifactKey);
        if (previous && previous !== identity) loaded.delete(previous);
        latestIdentityByArtifact.set(descriptor.artifactKey, identity);
        pending = (async () => {
          if (options.hostModules) registerServerFrameHostModules(options.hostModules);
          if (usesNativeImport) requireRegisteredSwitchboardHostModule();
          let module: { readonly default?: unknown };
          try {
            module = await importModule(descriptor.moduleUrl) as { readonly default?: unknown };
          } catch (error) {
            throw new ServerFrameArtifactLoadError(descriptor, error);
          }
          throwIfAborted(context.signal);
          const contribution = module.default;
          if (!isFrameContributionDefinition(contribution)) {
            throw new Error(`Artifact "${descriptor.artifactKey}" did not export a frame contribution.`);
          }
          if (contribution.slotId !== descriptor.slotId) {
            throw new Error(
              `Artifact "${descriptor.artifactKey}" returned slot "${contribution.slotId}"; expected "${descriptor.slotId}".`,
            );
          }
          return Object.freeze({ ...contribution, id: descriptor.artifactKey });
        })();
        loaded.set(identity, pending);
      }
      let contribution: FrameContributionDefinition;
      try {
        contribution = await pending;
      } catch (error) {
        if (loaded.get(identity) === pending) loaded.delete(identity);
        if (latestIdentityByArtifact.get(descriptor.artifactKey) === identity) {
          latestIdentityByArtifact.delete(descriptor.artifactKey);
        }
        throw error;
      }
      throwIfAborted(context.signal);
      contributions.push(contribution);
      identities[contribution.slotId] = `${descriptor.artifactKey}:${descriptor.hash}`;
    }
    return Object.freeze({
      contributions: Object.freeze(contributions),
      contributionIdentities: Object.freeze(identities),
    });
  };

  return async (url, context = {}) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await resolveOnce(url, context);
      } catch (error) {
        if (
          !(error instanceof ServerFrameArtifactLoadError)
          || context.signal?.aborted
          || attempt >= retries
        ) {
          throw unwrapArtifactLoadError(error);
        }
      }
    }
  };
}

function isServerFrameResolution(value: unknown): value is ServerFrameResolution {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ServerFrameResolution>;
  return nonEmptyString(candidate.artifactKey)
    && Array.isArray(candidate.artifacts)
    && candidate.artifacts.every(item =>
      !!item
      && nonEmptyString(item.artifactKey)
      && nonEmptyString(item.moduleUrl)
      && nonEmptyString(item.hash)
      && nonEmptyString(item.slotId))
    && candidate.artifacts.some(item => item.artifactKey === candidate.artifactKey);
}

function normalizeEndpoint(value: string): string {
  const endpoint = value.trim();
  if (!endpoint) throw new Error('Server frame endpoint must not be empty.');
  return endpoint;
}

function resolutionRequestUrl(endpoint: string, path: string): string {
  const separator = endpoint.includes('?')
    ? /[?&]$/.test(endpoint) ? '' : '&'
    : '?';
  return `${endpoint}${separator}path=${encodeURIComponent(path)}`;
}

function requireRegisteredSwitchboardHostModule(): void {
  const host = (globalThis as RuntimeGlobal)[SWITCHBOARD_SERVER_HOST_RUNTIME_GLOBAL_KEY]
    ?.modules.get('@epikodelabs/switchboard');
  if (!host) {
    throw new Error(
      'Native server frame imports require host modules registered through registerServerFrameHostModules().',
    );
  }
}

class ServerFrameArtifactLoadError extends Error {
  constructor(
    readonly descriptor: ServerFrameArtifactDelivery,
    override readonly cause: unknown,
  ) {
    super(`Failed to load Switchboard frame artifact "${descriptor.artifactKey}" (${descriptor.hash}).`);
    this.name = 'ServerFrameArtifactLoadError';
  }
}

function unwrapArtifactLoadError(error: unknown): unknown {
  return error instanceof ServerFrameArtifactLoadError && error.cause instanceof Error
    ? error.cause
    : error;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  if (typeof DOMException === 'function') {
    throw new DOMException('The frame resolution was aborted.', 'AbortError');
  }
  const error = new Error('The frame resolution was aborted.');
  error.name = 'AbortError';
  throw error;
}

function normalizeRetryCount(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('artifactRefreshRetries must be a non-negative integer.');
  }
  return value;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFrameContributionDefinition(value: unknown): value is FrameContributionDefinition {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FrameContributionDefinition>;
  return candidate.kind === 'frame-contribution'
    && typeof candidate.slotId === 'string'
    && Array.isArray(candidate.layout);
}

async function defaultServerFrameFetch(
  input: string,
  init: Readonly<{
    readonly credentials: 'same-origin';
    readonly headers: Readonly<Record<string, string>>;
    readonly signal?: AbortSignal;
  }>,
): Promise<ServerFrameFetchResponse> {
  if (typeof fetch !== 'function') throw new Error('Server frame resolution requires fetch().');
  return fetch(input, init) as Promise<ServerFrameFetchResponse>;
}

function defaultServerFrameImport(moduleUrl: string): Promise<unknown> {
  return import(/* @vite-ignore */ moduleUrl);
}
