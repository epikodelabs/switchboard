import { InjectionToken } from '@angular/core';
import type { FrameNode } from './frame-tree';
import type { NavigationOptions } from './vanilla-router';

export interface RelayTarget<TId extends string = string> { readonly kind: 'frame'; readonly id: TId; }
export interface RelayInput {
  readonly params?: Readonly<Record<string, unknown>>;
  readonly query?: Readonly<Record<string, unknown>>;
  readonly state?: unknown;
  readonly replace?: boolean;
}

export interface RelayPath {
  readonly origin: FrameNode;
  readonly bubble: readonly FrameNode[];
  readonly acceptedBy: FrameNode;
  readonly targetFrameId: string;
}

/** Runtime service. Relay itself is only an origin-bound capability. */
export interface RelayRuntime {
  resolve(origin: FrameNode, target: RelayTarget): RelayPath | null;
  navigate(origin: FrameNode, target: RelayTarget, input?: RelayInput): Promise<boolean>;
  href(origin: FrameNode, target: RelayTarget, input?: RelayInput): string | null;
}

export const FRAME_RELAY_RUNTIME = new InjectionToken<RelayRuntime>('FRAME_RELAY_RUNTIME');

export class Relay {
  constructor(public readonly origin: FrameNode, private readonly runtime: RelayRuntime) {}
  resolve(target: RelayTarget): RelayPath | null { return this.runtime.resolve(this.origin, target); }
  to(target: RelayTarget, input?: RelayInput): Promise<boolean> { return this.runtime.navigate(this.origin, target, input); }
  href(target: RelayTarget, input?: RelayInput): string | null { return this.runtime.href(this.origin, target, input); }
}

export function relayNavigationOptions(input: RelayInput | undefined): NavigationOptions {
  return { replace: input?.replace, state: input?.state };
}
