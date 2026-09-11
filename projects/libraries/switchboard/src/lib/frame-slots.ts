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

/** Contributes child frames to an ownership boundary. */
export function framesFor<
  const TSlotId extends string,
  const TChildren extends NavigationTree,
>(
  slotId: TSlotId,
  children: TChildren,
): FrameContributionDefinition<TSlotId, string, TChildren> {
  const normalized = normalizeIdentity(slotId, 'Frame contribution slot') as TSlotId;
  return defineFrameContribution(
    normalized,
    `${normalized}@${nextContributionIdentity++}`,
    children,
  );
}

/** Compiler/server hook for binding authoritative artifact identity. */
function defineFrameContribution<
  const TSlotId extends string,
  const TId extends string,
  const TChildren extends NavigationTree,
>(
  slotId: TSlotId,
  id: TId,
  children: TChildren,
): FrameContributionDefinition<TSlotId, TId, TChildren> {
  return Object.freeze({
    kind: 'frame-contribution',
    slotId: normalizeIdentity(slotId, 'Frame contribution slot') as TSlotId,
    id: normalizeIdentity(id, 'Frame contribution') as TId,
    children,
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

  const resolveChildren = (children: NavigationTree): NavigationTree => {
    const output = [] as unknown as Array<NavigationTree[number]>;
    for (const entry of children) {
      if (entry.kind === 'frame-slot') {
        const contribution = bySlot.get(entry.slotId);
        if (!contribution) continue;
        if (resolving.has(entry.slotId)) {
          throw new Error(`Cyclic frame slot ownership at "${entry.slotId}".`);
        }
        resolving.add(entry.slotId);
        used.add(entry.slotId);
        output.push(...resolveChildren(contribution.children));
        resolving.delete(entry.slotId);
        continue;
      }

      if (entry.kind === 'layout') {
        output.push(Object.freeze({
          ...entry,
          children: resolveChildren(entry.children),
        }) as NavigationTree[number]);
        continue;
      }

      if (entry.kind === 'frame' && entry.children) {
        output.push(Object.freeze({
          ...entry,
          children: resolveChildren(entry.children),
        }) as NavigationTree[number]);
        continue;
      }

      output.push(entry);
    }
    return Object.freeze(output);
  };

  const resolved = resolveChildren(root);
  for (const contribution of contributions) {
    if (!used.has(contribution.slotId)) {
      throw new Error(
        `Frame contribution "${contribution.id}" targets unknown slot "${contribution.slotId}".`,
      );
    }
  }
  return resolved;
}
