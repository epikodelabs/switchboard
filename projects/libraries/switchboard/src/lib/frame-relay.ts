import { InjectionToken } from '@angular/core';

import type { NavigationOptions } from './vanilla-router';
import type { NavigationTarget } from './navigation-targets';

/** A resolved peer-to-peer relay route. Resolution is pure: no lifecycle or DOM work has run yet. */
export interface RelayPath {
  readonly originFrameId: string;
  /** Frames that handled the request while it bubbled, origin first. */
  readonly bubble: readonly string[];
  /** The frame whose declared connection accepted the request. */
  readonly acceptedByFrameId: string;
  /** Destination frames entered by the relay. The first pass has one addressed destination. */
  readonly cascade: readonly string[];
  readonly targetFrameId: string;
}

export interface RelayTransport {
  resolveRelay(originFrameId: string, target: NavigationTarget): RelayPath | null;
  navigateRelay(
    originFrameId: string,
    target: NavigationTarget,
    options?: NavigationOptions,
  ): Promise<boolean>;
  hrefRelay(originFrameId: string, target: NavigationTarget): string | null;
}


export interface RelayFrameRecord {
  readonly frameId: string;
  readonly parentFrameIds: readonly string[];
  readonly transitions: readonly string[];
}

/** Pure peer-resolution primitive used by the runtime and tests. */
export function resolveRelayPath(
  frames: ReadonlyMap<string, RelayFrameRecord>,
  originFrameId: string,
  targetFrameId: string,
): RelayPath | null {
  const origin = frames.get(originFrameId);
  const target = frames.get(targetFrameId);
  if (!origin || !target) return null;

  if (originFrameId === targetFrameId) {
    return Object.freeze({
      originFrameId,
      bubble: Object.freeze([originFrameId]),
      acceptedByFrameId: originFrameId,
      cascade: Object.freeze([targetFrameId]),
      targetFrameId,
    });
  }

  const candidates = [originFrameId, ...origin.parentFrameIds];
  for (let index = 0; index < candidates.length; index++) {
    const candidateId = candidates[index];
    if (!frames.get(candidateId)?.transitions.includes(targetFrameId)) continue;
    return Object.freeze({
      originFrameId,
      bubble: Object.freeze(candidates.slice(0, index + 1)),
      acceptedByFrameId: candidateId,
      cascade: Object.freeze([targetFrameId]),
      targetFrameId,
    });
  }

  return null;
}

/** @internal Transport shared by frame-local Relay endpoints. */
export const FRAME_RELAY_TRANSPORT = new InjectionToken<RelayTransport>('FRAME_RELAY_TRANSPORT');

/**
 * Navigation capability local to one active Frame.
 *
 * Relay does not own application navigation state. It identifies the peer that
 * originated a request; Switchboard then bubbles the request through authored
 * frame ownership until a declared connection accepts it and cascades to the
 * addressed frame.
 */
export class Relay {
  constructor(
    public readonly originFrameId: string,
    private readonly transport: RelayTransport,
  ) {}

  resolve(target: NavigationTarget): RelayPath | null {
    return this.transport.resolveRelay(this.originFrameId, target);
  }

  to(target: NavigationTarget, options?: NavigationOptions): Promise<boolean> {
    return this.transport.navigateRelay(this.originFrameId, target, options);
  }

  href(target: NavigationTarget): string | null {
    return this.transport.hrefRelay(this.originFrameId, target);
  }
}

