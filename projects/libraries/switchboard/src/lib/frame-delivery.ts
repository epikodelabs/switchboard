import type {
  FrameContributionDefinition,
  NavigationPolicy,
  NavigationTree,
} from './navigation-definitions';
import { resolveFrameSlots } from './frame-slots';

export interface FramePrincipal {
  readonly authenticated?: boolean;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
}

/** Server-owned metadata for one protected frame-graph artifact. */
export interface FrameArtifactDescriptor {
  readonly artifactKey: string;
  readonly slotId: string;
  readonly policy?: NavigationPolicy;
}

export interface DeliveredFrameArtifact {
  readonly descriptor: FrameArtifactDescriptor;
  readonly contribution: FrameContributionDefinition;
}

export type FrameArtifactLoader = (
  descriptor: FrameArtifactDescriptor,
) => Promise<FrameContributionDefinition>;

/**
 * Minimal policy evaluator for server delivery. Backend/API authorization remains
 * independent; this controls whether frontend graph code may be disclosed.
 */
export function allowsFrameArtifact(
  policy: NavigationPolicy | undefined,
  principal: FramePrincipal | null | undefined,
): boolean {
  if (!policy) return true;

  const authenticated = principal?.authenticated === true;
  if (!authenticated && policy.allowAnonymous !== true) return false;

  const roles = new Set(principal?.roles ?? []);
  for (const role of policy.roles ?? []) {
    if (!roles.has(role)) return false;
  }

  const permissions = new Set(principal?.permissions ?? []);
  for (const permission of policy.permissions ?? []) {
    if (!permissions.has(permission)) return false;
  }

  return true;
}

export function authorizeFrameArtifacts(
  descriptors: readonly FrameArtifactDescriptor[],
  principal: FramePrincipal | null | undefined,
): readonly FrameArtifactDescriptor[] {
  return Object.freeze(
    descriptors.filter(descriptor =>
      allowsFrameArtifact(descriptor.policy, principal),
    ),
  );
}

/**
 * Loads only server-authorized graph artifacts, validates their identity, and
 * resolves them into the root graph. The same function is usable during SSR
 * and before browser navigation starts after hydration.
 */
export async function resolveDeliveredFrames(
  root: NavigationTree,
  descriptors: readonly FrameArtifactDescriptor[],
  load: FrameArtifactLoader,
): Promise<NavigationTree> {
  const contributions = await Promise.all(
    descriptors.map(async descriptor => {
      const contribution = await load(descriptor);
      if (contribution.slotId !== descriptor.slotId) {
        throw new Error(
          `Frame artifact "${descriptor.artifactKey}" returned slot ` +
          `"${contribution.slotId}"; expected "${descriptor.slotId}".`,
        );
      }

      return Object.freeze({
        ...contribution,
        // Artifact identity belongs to the compiler/server delivery layer.
        id: descriptor.artifactKey,
      });
    }),
  );

  return resolveFrameSlots(root, contributions);
}

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

function registerServerFrameHostModules(modules: ServerFrameHostModules): void {
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
  if (!options.importModule) {
    if (!options.hostModules?.['@epikodelabs/switchboard']) {
      throw new Error(
        'Native server frame imports require hostModules["@epikodelabs/switchboard"].',
      );
    }
  }
  if (options.hostModules) registerServerFrameHostModules(options.hostModules);

  const endpoint = (options.endpoint ?? '/api/navigation/resolve').replace(/\/+$/, '');
  const fetchFrames = options.fetch ?? defaultServerFrameFetch;
  const importModule = options.importModule ?? defaultServerFrameImport;
  const loaded = new Map<string, Promise<FrameContributionDefinition>>();

  return async (url, context = {}) => {
    if (context.signal?.aborted) throw context.signal.reason ?? new DOMException('Aborted', 'AbortError');
    const path = `${url.pathname}${url.search}${url.hash}`;
    const response = await fetchFrames(
      `${endpoint}?path=${encodeURIComponent(path)}`,
      {
        credentials: 'same-origin',
        headers: Object.freeze({ Accept: 'application/json' }),
        signal: context.signal,
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to resolve frame graph for "${path}": ${response.status}.`);
    const payload = await response.json();
    if (!isServerFrameResolution(payload)) {
      throw new Error(`Server returned an invalid Switchboard frame resolution for "${path}".`);
    }

    const contributions: FrameContributionDefinition[] = [];
    const identities: Record<string, string> = {};
    for (const descriptor of payload.artifacts) {
      const identity = `${descriptor.artifactKey}:${descriptor.hash}:${descriptor.moduleUrl}`;
      let pending = loaded.get(identity);
      if (!pending) {
        pending = (async () => {
          if (options.hostModules) registerServerFrameHostModules(options.hostModules);
          const module = await importModule(descriptor.moduleUrl) as { readonly default?: unknown };
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
      const contribution = await pending;
      contributions.push(contribution);
      identities[contribution.slotId] = identity;
    }
    return Object.freeze({
      contributions: Object.freeze(contributions),
      contributionIdentities: Object.freeze(identities),
    });
  };
}

function isServerFrameResolution(value: unknown): value is ServerFrameResolution {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ServerFrameResolution>;
  return typeof candidate.artifactKey === 'string'
    && Array.isArray(candidate.artifacts)
    && candidate.artifacts.every(item =>
      !!item
      && typeof item.artifactKey === 'string'
      && typeof item.moduleUrl === 'string'
      && typeof item.hash === 'string'
      && typeof item.slotId === 'string');
}

function isFrameContributionDefinition(value: unknown): value is FrameContributionDefinition {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FrameContributionDefinition>;
  return candidate.kind === 'frame-contribution'
    && typeof candidate.slotId === 'string'
    && Array.isArray(candidate.entries);
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
