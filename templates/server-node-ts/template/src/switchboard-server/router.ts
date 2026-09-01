import type {
  ServerFrameArtifact,
  ServerFrameBranch,
  ServerFrameResolution,
  ServerFrameSnapshot,
  ServerPrincipal,
} from './models.js';
import type { SnapshotSource } from './snapshot-source.js';

export interface ServerRouterOptions {
  readonly source: SnapshotSource;
  readonly moduleUrlFor?: (artifact: ServerFrameArtifact) => string;
}

export interface AuthorizedModule {
  readonly artifact: ServerFrameArtifact;
}

export interface SwitchboardServerRouter {
  resolve(target: string, principal?: ServerPrincipal): Promise<ServerFrameResolution | null>;
  resolveModule(artifactKey: string, hash: string, principal?: ServerPrincipal): Promise<AuthorizedModule | null>;
}

export function createSwitchboardServerRouter(options: ServerRouterOptions): SwitchboardServerRouter {
  const moduleUrlFor = options.moduleUrlFor ?? (artifact =>
    `/api/navigation/modules/${encodeURIComponent(artifact.artifactKey)}/${encodeURIComponent(artifact.hash)}`);

  return Object.freeze({
    async resolve(target: string, principal?: ServerPrincipal) {
      const snapshot = await options.source.loadSnapshot();
      const branch = matchTarget(snapshot, target);
      if (!branch) return null;
      const artifact = snapshot.index.artifacts.find(item => item.frameSetId === branch.frameSetId);
      if (!artifact) return null;
      const chain = resolveArtifactChain(snapshot, artifact.artifactKey);
      if (!isChainAuthorized(snapshot, chain, principal)) return null;
      return Object.freeze({
        artifactKey: artifact.artifactKey,
        artifacts: Object.freeze(chain.map(item => Object.freeze({
          artifactKey: item.artifactKey,
          moduleUrl: moduleUrlFor(item),
          hash: item.hash,
          slotId: item.slotId,
        }))),
      });
    },

    async resolveModule(artifactKey: string, hash: string, principal?: ServerPrincipal) {
      const snapshot = await options.source.loadSnapshot();
      const artifact = snapshot.index.artifacts.find(item =>
        item.artifactKey === artifactKey && item.hash === hash);
      if (!artifact) return null;
      const chain = resolveArtifactChain(snapshot, artifact.artifactKey);
      if (!isChainAuthorized(snapshot, chain, principal)) return null;
      return Object.freeze({ artifact });
    },
  });
}

function matchTarget(snapshot: ServerFrameSnapshot, target: string): ServerFrameBranch | undefined {
  let pathname: string;
  try {
    pathname = new URL(target, 'http://switchboard.local').pathname;
  } catch {
    return undefined;
  }
  const candidates = snapshot.index.shards
    .filter(shard => prefixMatches(pathname, shard.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  const candidateFiles = new Set(candidates.map(item => item.file));
  if (candidateFiles.size === 0) return undefined;
  return [...snapshot.branches.values()].find(branch =>
    branch.path !== undefined
    && prefixMatches(pathname, branch.staticPrefix)
    && matchPattern(branch.path, pathname));
}

function resolveArtifactChain(snapshot: ServerFrameSnapshot, artifactKey: string): readonly ServerFrameArtifact[] {
  const byKey = new Map(snapshot.index.artifacts.map(item => [item.artifactKey, item] as const));
  const output: ServerFrameArtifact[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;
    if (visiting.has(key)) throw new Error(`Recursive artifact dependency: ${key}`);
    const artifact = byKey.get(key);
    if (!artifact) throw new Error(`Missing artifact dependency: ${key}`);
    visiting.add(key);
    for (const dependency of artifact.dependencies) visit(dependency);
    visiting.delete(key);
    visited.add(key);
    output.push(artifact);
  }

  visit(artifactKey);
  return Object.freeze(output);
}

function isChainAuthorized(
  snapshot: ServerFrameSnapshot,
  chain: readonly ServerFrameArtifact[],
  principal?: ServerPrincipal,
): boolean {
  return chain.every(artifact => artifact.branchIds.length > 0
    && artifact.branchIds.every(id => {
      const branch = snapshot.branches.get(id);
      return !!branch
        && branch.frameSetId === artifact.frameSetId
        && branch.policies.every(policy => isPolicyAllowed(policy, principal));
    }));
}

function isPolicyAllowed(
  policy: ServerFrameBranch['policies'][number],
  principal?: ServerPrincipal,
): boolean {
  if (policy.allowAnonymous) return true;
  if (!principal) return false;
  const roles = policy.roles ?? [];
  return (roles.length === 0 || roles.some(role => principal.roles.has(role)))
    && (policy.permissions ?? []).every(permission => principal.permissions.has(permission));
}

function prefixMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname.startsWith('/');
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchPattern(pattern: string, pathname: string): boolean {
  const expected = segments(pattern);
  const actual = segments(pathname);
  if (expected.length !== actual.length) return false;
  return expected.every((segment, index) =>
    segment.startsWith(':') || segment === actual[index]);
}

function segments(value: string): readonly string[] {
  return value.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}
