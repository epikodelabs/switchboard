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
