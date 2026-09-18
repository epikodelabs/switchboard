import { InjectionToken } from '@angular/core';

export interface FrameNode {
  readonly key: number;
  readonly frameId: string;
  readonly host: HTMLElement;
  parent: FrameNode | null;
  slot: string;
  readonly children: Map<string, FrameNode>;
}


export interface FrameProjection {
  /** Visible frame that accepted the relay request. */
  readonly acceptedBy: FrameNode;
  /** Parent that owns the branch being transformed; null means a root branch. */
  readonly parent: FrameNode | null;
  /** Child/root slot whose branch is transformed. Empty string is primary. */
  readonly slot: string;
  /** Existing materialized root of the affected branch. */
  readonly current: FrameNode;
  /** Frame definition that should become the root of the projected branch. */
  readonly targetFrameId: string;
}

export interface FrameReconciliation {
  readonly projection: FrameProjection;
  readonly keep: readonly FrameNode[];
  readonly leave: readonly FrameNode[];
  readonly enteringFrameId: string | null;
}

/**
 * Authoritative runtime model of the materialized application.
 *
 * DOM ancestry is deliberately not used to discover ownership. A frame becomes
 * a child only when Switchboard mounts it into an outlet owned by another
 * materialized frame. This keeps named outlets and future non-DOM renderers on
 * the same navigation model.
 */
export class FrameTree {
  private nextKey = 1;
  private readonly byHost = new WeakMap<HTMLElement, FrameNode>();
  private readonly nodes = new Map<number, FrameNode>();
  private readonly rootsBySlot = new Map<string, FrameNode>();

  create(frameId: string, host: HTMLElement): FrameNode {
    const node: FrameNode = {
      key: this.nextKey++,
      frameId,
      host,
      parent: null,
      slot: '',
      children: new Map(),
    };
    this.nodes.set(node.key, node);
    this.byHost.set(host, node);
    return node;
  }

  nodeForHost(host: HTMLElement): FrameNode | null {
    return this.byHost.get(host) ?? null;
  }

  /** Mount a materialized frame into a concrete outlet. */
  mount(node: FrameNode, outlet: HTMLElement, slot = outlet.getAttribute('name')?.trim() ?? ''): void {
    this.detach(node);
    const ownerHost = outlet.closest<HTMLElement>('frame-host');
    const owner = ownerHost ? this.nodeForHost(ownerHost) : null;
    node.parent = owner;
    node.slot = slot;
    if (owner) {
      const previous = owner.children.get(slot);
      if (previous && previous !== node) this.detach(previous);
      owner.children.set(slot, node);
    } else {
      const previous = this.rootsBySlot.get(slot);
      if (previous && previous !== node) this.detach(previous);
      this.rootsBySlot.set(slot, node);
    }
  }

  mountHost(host: Node, outlet: HTMLElement): void {
    if (host.nodeType !== 1) return;
    const node = this.nodeForHost(host as HTMLElement);
    if (node) this.mount(node, outlet);
  }

  remove(node: FrameNode): void {
    for (const child of [...node.children.values()]) this.remove(child);
    this.detach(node);
    this.nodes.delete(node.key);
    this.byHost.delete(node.host);
  }

  bubble(origin: FrameNode): readonly FrameNode[] {
    if (!this.nodes.has(origin.key)) return Object.freeze([]);
    const chain: FrameNode[] = [];
    for (let node: FrameNode | null = origin; node; node = node.parent) chain.push(node);
    return Object.freeze(chain);
  }

  /**
   * Project peer navigation onto the materialized tree. If an ancestor accepts
   * a bubbled request, the branch from that ancestor toward the origin is
   * replaced. If the origin accepts its own peer transition, the origin itself
   * is replaced in its parent slot.
   */
  project(origin: FrameNode, acceptedBy: FrameNode, targetFrameId: string): FrameProjection | null {
    if (!this.nodes.has(origin.key) || !this.nodes.has(acceptedBy.key)) return null;

    if (origin === acceptedBy) {
      return Object.freeze({
        acceptedBy,
        parent: acceptedBy.parent,
        slot: acceptedBy.slot,
        current: acceptedBy,
        targetFrameId,
      });
    }

    let branch = origin;
    while (branch.parent && branch.parent !== acceptedBy) branch = branch.parent;
    if (branch.parent !== acceptedBy) return null;

    return Object.freeze({
      acceptedBy,
      parent: acceptedBy,
      slot: branch.slot,
      current: branch,
      targetFrameId,
    });
  }

  reconcile(projection: FrameProjection): FrameReconciliation {
    const keep: FrameNode[] = [];
    const parent = projection.parent;

    if (parent) {
      keep.push(parent);
      for (const [slot, child] of parent.children) {
        if (slot !== projection.slot) this.collectSubtree(child, keep);
      }
    } else {
      for (const [slot, root] of this.rootsBySlot) {
        if (slot !== projection.slot) this.collectSubtree(root, keep);
      }
    }

    const sameRoot = projection.current.frameId === projection.targetFrameId;
    const leave: FrameNode[] = [];
    if (sameRoot) this.collectSubtree(projection.current, keep);
    else this.collectSubtree(projection.current, leave);

    return Object.freeze({
      projection,
      keep: Object.freeze(keep),
      leave: Object.freeze(leave),
      enteringFrameId: sameRoot ? null : projection.targetFrameId,
    });
  }

  roots(): readonly FrameNode[] {
    return Object.freeze([...this.rootsBySlot.values()]);
  }

  private collectSubtree(node: FrameNode, output: FrameNode[]): void {
    output.push(node);
    for (const child of node.children.values()) this.collectSubtree(child, output);
  }

  private detach(node: FrameNode): void {
    if (node.parent) {
      if (node.parent.children.get(node.slot) === node) node.parent.children.delete(node.slot);
    } else if (this.rootsBySlot.get(node.slot) === node) {
      this.rootsBySlot.delete(node.slot);
    }
    node.parent = null;
    node.slot = '';
  }
}

export const FRAME_TREE = new InjectionToken<FrameTree>('FRAME_TREE');
