import type { LoadedContribution, NavigationSnapshot } from './navigation-snapshot.js';

export interface ServerFramePolicy {
  readonly allowAnonymous?: boolean;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
}
export interface PlannedServerFrame {
  readonly id: string;
  readonly frameId?: string;
  readonly path?: string;
  readonly staticPrefix: string;
  readonly policies: readonly ServerFramePolicy[];
  readonly frameSetId: string;
}
export interface PlannedArtifact {
  readonly kind: 'frame';
  readonly artifactKey: string;
  readonly frameSetId: string;
  readonly slotId: string;
  readonly dependencies: readonly string[];
  readonly frameIds: readonly string[];
  readonly branchIds: readonly string[];
  readonly sourceFile: string;
  readonly exportName: string;
}
export interface ServerFramePlan {
  readonly frames: readonly PlannedServerFrame[];
  readonly artifacts: readonly PlannedArtifact[];
}
interface MutableArtifact {
  readonly kind: 'frame'; artifactKey: string; frameSetId: string; slotId: string;
  dependencies: Set<string>; frameIds: string[]; branchIds: string[]; sourceFile: string; exportName: string;
}
interface Context {
  contributionsBySlot: ReadonlyMap<string, readonly LoadedContribution[]>;
  artifacts: Map<string, MutableArtifact>;
  frames: PlannedServerFrame[];
  active: Set<string>;
  nextBranchId: number;
}
interface Provenance { contributionId: string; }

export function createServerFramePlan(snapshot: NavigationSnapshot): ServerFramePlan {
  const context: Context = {
    contributionsBySlot: indexContributions(snapshot.contributions), artifacts: new Map(), frames: [], active: new Set(), nextBranchId: 1,
  };
  compileEntries(snapshot.rootRoutes, '/', [], context);
  for (const c of snapshot.contributions) {
    if (!context.artifacts.has(c.definition.id)) throw new Error(`Frame contribution "${c.definition.id}" targets unreachable slot "${c.definition.slotId}".`);
  }
  return Object.freeze({
    frames: Object.freeze([...context.frames]),
    artifacts: Object.freeze([...context.artifacts.values()].map(a => Object.freeze({
      kind: a.kind, artifactKey: a.artifactKey, frameSetId: a.frameSetId, slotId: a.slotId,
      dependencies: Object.freeze([...a.dependencies]), frameIds: Object.freeze([...a.frameIds]), branchIds: Object.freeze([...a.branchIds]),
      sourceFile: a.sourceFile, exportName: a.exportName,
    }))),
  });
}

function compileEntries(entries: readonly any[], parentPath: string, inherited: readonly ServerFramePolicy[], context: Context, provenance?: Provenance): void {
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.kind === 'layout') {
      compileEntries(entry.entries ?? [], joinPath(parentPath, String(entry.path ?? '')), appendPolicy(inherited, entry.policy), context, provenance);
      continue;
    }
    if (entry.kind === 'frame-slot') {
      const slotId = String(entry.slotId ?? '').trim();
      for (const c of context.contributionsBySlot.get(slotId) ?? []) compileContribution(c, parentPath, inherited, context, provenance);
      continue;
    }
    if (entry.kind === 'route') {
      compileRoute(entry, joinPath(parentPath, String(entry.path ?? '')), inherited, context, provenance);
      continue;
    }
    if (entry.kind === 'redirect') {
      if (!provenance) continue;
      const artifact = context.artifacts.get(provenance.contributionId);
      const id = `${provenance.contributionId}:${context.nextBranchId++}`;
      artifact?.branchIds.push(id);
      context.frames.push(Object.freeze({ id, path: joinPath(parentPath, String(entry.path ?? '')), staticPrefix: staticPrefix(joinPath(parentPath, String(entry.path ?? ''))), policies: Object.freeze(appendPolicy(inherited, entry.policy)), frameSetId: provenance.contributionId }));
    }
  }
}
function compileRoute(entry: any, path: string, inherited: readonly ServerFramePolicy[], context: Context, provenance?: Provenance): void {
  if (!provenance) return;
  const artifact = context.artifacts.get(provenance.contributionId);
  const frame = entry.frame;
  const frameId = typeof frame?.id === 'string' ? frame.id : undefined;
  if (frameId && !artifact?.frameIds.includes(frameId)) artifact?.frameIds.push(frameId);
  const enforcesGraph = frameId !== undefined
    && (frame.transitions !== undefined || frame.directEntry !== undefined || frame.directEntryRedirectTo !== undefined);
  // Graph-internal frames reject cold entry client-side; the server does not
  // announce a delivery branch for them.
  if (enforcesGraph && frame.directEntry !== true) return;
  const id = `${provenance.contributionId}:${context.nextBranchId++}`;
  artifact?.branchIds.push(id);
  context.frames.push(Object.freeze({ id, frameId, path, staticPrefix: staticPrefix(path), policies: Object.freeze(appendPolicy(inherited, entry.policy ?? frame?.policy)), frameSetId: provenance.contributionId }));
}
function compileContribution(c: LoadedContribution, parentPath: string, inherited: readonly ServerFramePolicy[], context: Context, parent?: Provenance): void {
  const id = String(c.definition.id).trim();
  if (context.active.has(id)) throw new Error(`Recursive frame contribution "${id}" was detected.`);
  let artifact = context.artifacts.get(id);
  if (!artifact) {
    artifact = { kind:'frame', artifactKey:id, frameSetId:id, slotId:String(c.definition.slotId), dependencies:new Set(), frameIds:[], branchIds:[], sourceFile:c.sourceFile, exportName:c.exportName };
    context.artifacts.set(id, artifact);
  }
  if (parent && parent.contributionId !== id) artifact.dependencies.add(parent.contributionId);
  context.active.add(id);
  try { compileEntries(c.definition.entries ?? [], parentPath, inherited, context, { contributionId:id }); }
  finally { context.active.delete(id); }
}
function indexContributions(contributions: readonly LoadedContribution[]): ReadonlyMap<string, readonly LoadedContribution[]> {
  const out = new Map<string, LoadedContribution[]>(), ids = new Set<string>();
  for (const c of contributions) {
    const id=String(c.definition.id).trim(), slot=String(c.definition.slotId).trim();
    if (ids.has(id)) throw new Error(`Duplicate frame contribution id "${id}".`); ids.add(id);
    const arr=out.get(slot) ?? []; arr.push(c); out.set(slot,arr);
  }
  return out;
}
function appendPolicy(policies: readonly ServerFramePolicy[], value: unknown): readonly ServerFramePolicy[] {
  if (!isPolicy(value)) return policies;
  return Object.freeze([...policies, Object.freeze({ allowAnonymous:value.allowAnonymous, roles:value.roles ? Object.freeze([...value.roles]) : undefined, permissions:value.permissions ? Object.freeze([...value.permissions]) : undefined })]);
}
function isPolicy(value: unknown): value is ServerFramePolicy {
  if (!value || typeof value !== 'object') return false; const c=value as any;
  return (c.allowAnonymous===undefined || typeof c.allowAnonymous==='boolean') && (c.roles===undefined || (Array.isArray(c.roles)&&c.roles.every((x:unknown)=>typeof x==='string'))) && (c.permissions===undefined || (Array.isArray(c.permissions)&&c.permissions.every((x:unknown)=>typeof x==='string')));
}
function joinPath(parent:string, child:string):string { const left=normalizePath(parent), right=child.trim().replace(/^\/+|\/+$/g,''); if(!right)return left; return normalizePath(left==='/'?`/${right}`:`${left}/${right}`); }
function normalizePath(value:string):string { const n=`/${value}`.replace(/\/+/g,'/').replace(/\/+$/g,''); return n||'/'; }
function staticPrefix(routePath:string):string { const out:string[]=[]; for(const s of normalizePath(routePath).split('/').filter(Boolean)){ if(s.startsWith(':'))break; out.push(s); } return out.length?`/${out.join('/')}`:'/'; }
export function commonStaticPrefix(frames: readonly PlannedServerFrame[]): string {
  if (!frames.length) return '/'; const parts=frames.map(f=>f.staticPrefix.split('/').filter(Boolean)); const first=parts[0]??[]; const common:string[]=[];
  for(let i=0;i<first.length;i++){ const v=first[i]; if(parts.every(p=>p[i]===v)) common.push(v); else break; } return common.length?`/${common.join('/')}`:'/';
}
