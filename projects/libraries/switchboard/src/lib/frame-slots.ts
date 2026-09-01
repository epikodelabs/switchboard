import type {
  FrameContributionDefinition,
  FrameSlotDefinition,
  NavigationTree,
} from './navigation-definitions';

let nextContributionIdentity = 1;

function normalizeIdentity(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} must not be empty.`);
  }
  return normalized;
}

/** Declares an ownership boundary in the frame graph. */
export function frameSlot<const TSlotId extends string>(
  slotId: TSlotId,
  load?: () => import('./navigation-definitions').MaybePromise<
    FrameContributionDefinition<TSlotId>
  >,
): FrameSlotDefinition<TSlotId> {
  return Object.freeze({
    kind: 'frame-slot',
    slotId: normalizeIdentity(slotId, 'Frame slot') as TSlotId,
    load,
  });
}

/** Contributes frames/navigation entries to an ownership boundary. */
export function framesFor<
  const TSlotId extends string,
  const TEntries extends NavigationTree,
>(
  slotId: TSlotId,
  entries: TEntries,
): FrameContributionDefinition<TSlotId, string, TEntries> {
  const normalized = normalizeIdentity(slotId, 'Frame contribution slot') as TSlotId;
  return defineFrameContribution(
    normalized,
    `${normalized}@${nextContributionIdentity++}`,
    entries,
  );
}

/** @internal Compiler/server hook for binding authoritative artifact identity. */
export function defineFrameContribution<
  const TSlotId extends string,
  const TId extends string,
  const TEntries extends NavigationTree,
>(
  slotId: TSlotId,
  id: TId,
  entries: TEntries,
): FrameContributionDefinition<TSlotId, TId, TEntries> {
  return Object.freeze({
    kind: 'frame-contribution',
    slotId: normalizeIdentity(slotId, 'Frame contribution slot') as TSlotId,
    id: normalizeIdentity(id, 'Frame contribution') as TId,
    entries,
  });
}

/**
 * Resolves a root graph against an authorized contribution set.
 * Missing slots remain empty; unknown contributions are rejected.
 */
export function resolveFrameSlots(
  root: NavigationTree,
  contributions: readonly FrameContributionDefinition[],
): NavigationTree {
  const bySlot = new Map<string, FrameContributionDefinition>();
  for (const contribution of contributions) {
    if (bySlot.has(contribution.slotId)) {
      throw new Error(`Duplicate frame contribution for slot "${contribution.slotId}".`);
    }
    bySlot.set(contribution.slotId, contribution);
  }

  const used = new Set<string>();
  const resolving = new Set<string>();

  const resolveEntries = (entries: NavigationTree): NavigationTree => {
    const output = [] as unknown as Array<NavigationTree[number]>;
    for (const entry of entries) {
      if (entry.kind === 'frame-slot') {
        const contribution = bySlot.get(entry.slotId);
        if (!contribution) continue;
        if (resolving.has(entry.slotId)) {
          throw new Error(`Cyclic frame slot ownership at "${entry.slotId}".`);
        }
        resolving.add(entry.slotId);
        used.add(entry.slotId);
        output.push(...resolveEntries(contribution.entries));
        resolving.delete(entry.slotId);
        continue;
      }

      if (entry.kind === 'layout') {
        output.push(Object.freeze({
          ...entry,
          entries: resolveEntries(entry.entries),
        }) as NavigationTree[number]);
        continue;
      }

      output.push(entry);
    }
    return Object.freeze(output);
  };

  const resolved = resolveEntries(root);
  for (const contribution of contributions) {
    if (!used.has(contribution.slotId)) {
      throw new Error(
        `Frame contribution "${contribution.id}" targets unknown slot "${contribution.slotId}".`,
      );
    }
  }
  return resolved;
}


/** Resolves authored ownership loaders. Primarily useful without protected delivery. */
export async function resolveOwnedFrameSlots(
  root: NavigationTree,
  contributions: readonly FrameContributionDefinition[] = [],
): Promise<NavigationTree> {
  const provided = new Map(contributions.map(value => [value.slotId, value]));
  const loaded: FrameContributionDefinition[] = [...contributions];
  const loading = new Set<string>();

  const visit = async (entries: NavigationTree): Promise<void> => {
    for (const entry of entries) {
      if (entry.kind === 'layout') {
        await visit(entry.entries);
        continue;
      }
      if (entry.kind !== 'frame-slot' || provided.has(entry.slotId) || !entry.load) {
        continue;
      }
      if (loading.has(entry.slotId)) {
        throw new Error(`Cyclic frame slot ownership at "${entry.slotId}".`);
      }
      loading.add(entry.slotId);
      const contribution = await entry.load();
      loading.delete(entry.slotId);
      if (contribution.slotId !== entry.slotId) {
        throw new Error(
          `Frame slot "${entry.slotId}" loaded contribution for "${contribution.slotId}".`,
        );
      }
      provided.set(entry.slotId, contribution);
      loaded.push(contribution);
      await visit(contribution.entries);
    }
  };

  await visit(root);
  return resolveFrameSlots(root, loaded);
}
