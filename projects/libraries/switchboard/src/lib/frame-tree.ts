import { InjectionToken } from '@angular/core';

export interface FrameNode {
  readonly key: number;
  readonly frameId: string | null;
  readonly host: HTMLElement;
  readonly transitions: readonly string[];
  parent: FrameNode | null;
  slot: string;
  readonly children: Map<string, FrameNode>;
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
  private nextOutletOrder = 1;
  private readonly outlets = new Map<HTMLElement, { readonly name: string; readonly owner: FrameNode | null; readonly order: number }>();

  create(frameId: string | null, host: HTMLElement, transitions: readonly string[] = []): FrameNode {
    const node: FrameNode = {
      key: this.nextKey++,
      frameId,
      host,
      transitions: Object.freeze([...transitions]),
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

  contains(node: FrameNode): boolean {
    return this.nodes.get(node.key) === node;
  }

  registerOutlet(name: string, outlet: HTMLElement, owner: FrameNode | null): void {
    if (owner && !this.contains(owner)) {
      throw new Error('Cannot register an outlet for a FrameNode that is not part of this FrameTree.');
    }

    this.outlets.set(outlet, {
      name: name.trim(),
      owner,
      order: this.nextOutletOrder++,
    });
  }

  unregisterOutlet(outlet: HTMLElement): void {
    this.outlets.delete(outlet);
  }

  hasOutlet(outlet: HTMLElement): boolean {
    return this.outlets.has(outlet);
  }

  get outletCount(): number {
    return this.outlets.size;
  }

  /**
   * Return the logical owner recorded when the outlet connected.
   *
   * Ownership and visibility are deliberately separate. Angular composes a
   * layout subtree before VanillaRouter commits its root host. Children must
   * still attach to their logical parent during that detached composition;
   * outlet() is responsible for exposing only outlets whose owners are rooted
   * in the currently materialized tree.
   */
  ownerOf(outlet: HTMLElement): FrameNode | null {
    const owner = this.outlets.get(outlet)?.owner ?? null;
    return owner && this.contains(owner) ? owner : null;
  }

  /** True only while the frame participates in the currently visible tree. */
  isMaterialized(node: FrameNode): boolean {
    if (!this.contains(node)) return false;
    if (node.parent) {
      return this.isMaterialized(node.parent) && node.parent.children.get(node.slot) === node;
    }
    return this.rootsBySlot.get(node.slot) === node;
  }

  /** Resolve a named outlet in the currently materialized tree. */
  outlet(name: string, incoming?: Node): HTMLElement | null {
    const targetName = name.trim();
    const incomingFrame = incoming && incoming.nodeType === 1
      ? this.nodeForHost(incoming as HTMLElement)
      : null;

    // A primary frame render has an exact structural destination. The root
    // layer of a composed render already carries its logical parent in the
    // detached FrameTree, so do not use "deepest outlet wins" here: on a
    // sibling navigation that would place the new layout inside the old
    // layout and the old render's disposal would then remove both.
    //
    // Root frame      -> root primary outlet (owner === null)
    // Nested frame    -> primary outlet owned by its logical parent
    const exactPrimaryOwner = targetName === '' && incomingFrame
      ? incomingFrame.parent
      : undefined;

    let selected: { readonly element: HTMLElement; readonly depth: number; readonly order: number } | null = null;

    for (const [element, record] of this.outlets) {
      if (record.name !== targetName) continue;
      if (exactPrimaryOwner !== undefined && record.owner !== exactPrimaryOwner) continue;
      // Never choose an outlet contained by the node that is about to be
      // committed. Incoming components connect their outlets before commit.
      if (incoming && incoming.nodeType === 1 && (incoming as Element).contains(element)) continue;
      if (record.owner && !this.isMaterialized(record.owner)) continue;
      const depth = record.owner ? this.depth(record.owner) : 0;
      if (selected && (depth < selected.depth || (depth === selected.depth && record.order < selected.order))) continue;
      selected = { element, depth, order: record.order };
    }

    return selected?.element ?? null;
  }

  depth(node: FrameNode): number {
    if (!this.contains(node)) return -1;
    let depth = 0;
    for (let parent = node.parent; parent; parent = parent.parent) depth++;
    return depth;
  }

  /** Mount a materialized frame into a concrete, connected outlet. */
  mount(node: FrameNode, outlet: HTMLElement, slot = outlet.getAttribute('name')?.trim() ?? ''): void {
    if (!this.contains(node)) {
      throw new Error('Cannot mount a FrameNode that is not part of this FrameTree.');
    }

    const outletRecord = this.outlets.get(outlet);
    if (!outletRecord) {
      throw new Error('Cannot mount a FrameNode into an outlet that is not connected to this FrameTree.');
    }

    const owner = outletRecord.owner && this.contains(outletRecord.owner)
      ? outletRecord.owner
      : null;

    // A tree node cannot be mounted into an outlet owned by itself or one of
    // its descendants. Besides corrupting bubble()/materialization semantics,
    // such a cycle would make recursive ownership checks non-terminating.
    for (let candidate = owner; candidate; candidate = candidate.parent) {
      if (candidate === node) {
        throw new Error('Cannot mount a FrameNode into an outlet owned by itself or its descendant.');
      }
    }

    this.detach(node);
    node.parent = owner;
    node.slot = slot;
    if (owner) {
      const previous = owner.children.get(slot);
      if (previous && previous !== node) this.remove(previous);
      owner.children.set(slot, node);
    } else {
      const previous = this.rootsBySlot.get(slot);
      if (previous && previous !== node) this.remove(previous);
      this.rootsBySlot.set(slot, node);
    }
  }

  mountHost(host: Node, outlet: HTMLElement): void {
    if (host.nodeType !== 1) return;
    const node = this.nodeForHost(host as HTMLElement);
    if (node) this.mount(node, outlet);
  }

  remove(node: FrameNode): void {
    if (!this.contains(node)) return;
    for (const child of [...node.children.values()]) this.remove(child);

    // A node owns its logical outlets for exactly the same lifetime as the
    // node itself. Angular directives will also disconnect during component
    // destruction, but tree removal must be authoritative so a failed or
    // replaced render cannot leave ghost outlets visible to the runtime.
    for (const [element, record] of this.outlets) {
      if (record.owner === node) this.outlets.delete(element);
    }

    this.detach(node);
    this.nodes.delete(node.key);
    this.byHost.delete(node.host);
  }

  bubble(origin: FrameNode): readonly FrameNode[] {
    if (!this.contains(origin)) return Object.freeze([]);
    const chain: FrameNode[] = [];
    for (let node: FrameNode | null = origin; node; node = node.parent) chain.push(node);
    return Object.freeze(chain);
  }

  roots(): readonly FrameNode[] {
    return Object.freeze([...this.rootsBySlot.values()]);
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

/** Materialized frame that owns the current Angular component scope. */
export const CURRENT_FRAME_NODE = new InjectionToken<FrameNode>('CURRENT_FRAME_NODE');
