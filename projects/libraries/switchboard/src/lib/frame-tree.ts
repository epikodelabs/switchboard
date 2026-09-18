import { InjectionToken } from '@angular/core';

interface MaterializedNodeBase {
  readonly key: number;
  readonly host: HTMLElement;
  parent: MaterializedNode | null;
  slot: string;
  readonly children: Map<string, MaterializedNode>;
}

/**
 * Structural Angular view scope in the materialized tree.
 *
 * View nodes exist only to preserve view/outlet ownership and lifetime. They
 * are not navigation states, have no frame id, and cannot accept Relay
 * transitions.
 */
export interface ViewNode extends MaterializedNodeBase {
  readonly kind: 'view';
}

/** Concrete materialized instance of an authored frame. */
export interface FrameNode extends MaterializedNodeBase {
  readonly kind: 'frame';
  readonly frameId: string;
  readonly transitions: readonly string[];
}

export type MaterializedNode = FrameNode | ViewNode;

export function isFrameNode(node: MaterializedNode): node is FrameNode {
  return node.kind === 'frame';
}

/**
 * Authoritative runtime model of the materialized Angular view/frame tree.
 *
 * Angular owns view creation and destruction. Switchboard records only the
 * logical ownership needed by FrameOutlet and Relay. DOM ancestry is never
 * used to reconstruct that ownership.
 */
export class FrameTree {
  private nextKey = 1;
  private readonly byHost = new WeakMap<HTMLElement, MaterializedNode>();
  private readonly nodes = new Map<number, MaterializedNode>();
  private readonly rootsBySlot = new Map<string, MaterializedNode>();
  private nextOutletOrder = 1;
  private readonly outlets = new Map<HTMLElement, {
    readonly name: string;
    readonly owner: MaterializedNode | null;
    readonly order: number;
  }>();

  /** Create an authored frame instance. */
  createFrame(frameId: string, host: HTMLElement, transitions: readonly string[] = []): FrameNode {
    const node: FrameNode = {
      kind: 'frame',
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

  /** Create a structural Angular view scope. */
  createView(host: HTMLElement): ViewNode {
    const node: ViewNode = {
      kind: 'view',
      key: this.nextKey++,
      host,
      parent: null,
      slot: '',
      children: new Map(),
    };
    this.nodes.set(node.key, node);
    this.byHost.set(host, node);
    return node;
  }

  /**
   * Compatibility factory retained for 1.0.x callers.
   * Prefer createFrame()/createView() in new runtime code.
   */
  create(frameId: string, host: HTMLElement, transitions?: readonly string[]): FrameNode;
  create(frameId: null, host: HTMLElement, transitions?: readonly string[]): ViewNode;
  create(frameId: string | null, host: HTMLElement, transitions?: readonly string[]): MaterializedNode;
  create(frameId: string | null, host: HTMLElement, transitions: readonly string[] = []): MaterializedNode {
    return frameId === null
      ? this.createView(host)
      : this.createFrame(frameId, host, transitions);
  }

  nodeForHost(host: HTMLElement): MaterializedNode | null {
    return this.byHost.get(host) ?? null;
  }

  contains(node: MaterializedNode): boolean {
    return this.nodes.get(node.key) === node;
  }

  registerOutlet(name: string, outlet: HTMLElement, owner: MaterializedNode | null): void {
    if (owner && !this.contains(owner)) {
      throw new Error('Cannot register an outlet for a node that is not part of this FrameTree.');
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

  /** Return the explicit Angular view/frame scope that owns an outlet. */
  ownerOf(outlet: HTMLElement): MaterializedNode | null {
    const owner = this.outlets.get(outlet)?.owner ?? null;
    return owner && this.contains(owner) ? owner : null;
  }

  /** True only while the node participates in the currently visible tree. */
  isMaterialized(node: MaterializedNode): boolean {
    if (!this.contains(node)) return false;
    if (node.parent) {
      return this.isMaterialized(node.parent) && node.parent.children.get(node.slot) === node;
    }
    return this.rootsBySlot.get(node.slot) === node;
  }

  /** Resolve a named outlet in the currently materialized tree. */
  outlet(name: string, incoming?: Node): HTMLElement | null {
    const targetName = name.trim();
    const incomingNode = incoming && incoming.nodeType === 1
      ? this.nodeForHost(incoming as HTMLElement)
      : null;

    // A primary composed view has an exact structural destination. Detached
    // composition already records the incoming node's logical parent, so use
    // that owner instead of guessing from outlet depth or registration order.
    const exactPrimaryOwner = targetName === '' && incomingNode
      ? incomingNode.parent
      : undefined;

    let selected: { readonly element: HTMLElement; readonly depth: number; readonly order: number } | null = null;

    for (const [element, record] of this.outlets) {
      if (record.name !== targetName) continue;
      if (exactPrimaryOwner !== undefined && record.owner !== exactPrimaryOwner) continue;
      if (incoming && incoming.nodeType === 1 && (incoming as Element).contains(element)) continue;
      if (record.owner && !this.isMaterialized(record.owner)) continue;
      const depth = record.owner ? this.depth(record.owner) : 0;
      if (selected && (depth < selected.depth || (depth === selected.depth && record.order < selected.order))) continue;
      selected = { element, depth, order: record.order };
    }

    return selected?.element ?? null;
  }

  depth(node: MaterializedNode): number {
    if (!this.contains(node)) return -1;
    let depth = 0;
    for (let parent = node.parent; parent; parent = parent.parent) depth++;
    return depth;
  }

  /** Mount a materialized Angular view/frame node into a connected outlet. */
  mount(node: MaterializedNode, outlet: HTMLElement, slot = outlet.getAttribute('name')?.trim() ?? ''): void {
    if (!this.contains(node)) {
      throw new Error('Cannot mount a node that is not part of this FrameTree.');
    }

    const outletRecord = this.outlets.get(outlet);
    if (!outletRecord) {
      throw new Error('Cannot mount a node into an outlet that is not connected to this FrameTree.');
    }

    const owner = outletRecord.owner && this.contains(outletRecord.owner)
      ? outletRecord.owner
      : null;

    for (let candidate = owner; candidate; candidate = candidate.parent) {
      if (candidate === node) {
        throw new Error('Cannot mount a node into an outlet owned by itself or its descendant.');
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

  remove(node: MaterializedNode): void {
    if (!this.contains(node)) return;
    for (const child of [...node.children.values()]) this.remove(child);

    for (const [element, record] of this.outlets) {
      if (record.owner === node) this.outlets.delete(element);
    }

    this.detach(node);
    this.nodes.delete(node.key);
    this.byHost.delete(node.host);
  }

  /** Full structural ancestry, including Angular view-only scopes. */
  ancestry(origin: MaterializedNode): readonly MaterializedNode[] {
    if (!this.contains(origin)) return Object.freeze([]);
    const chain: MaterializedNode[] = [];
    for (let node: MaterializedNode | null = origin; node; node = node.parent) chain.push(node);
    return Object.freeze(chain);
  }

  /**
   * Relay ancestry. Structural Angular ViewNodes are intentionally skipped;
   * only authored frames can originate/accept frame navigation.
   */
  bubble(origin: FrameNode): readonly FrameNode[] {
    if (!this.contains(origin) || !isFrameNode(origin)) return Object.freeze([]);
    const chain: FrameNode[] = [];
    for (let node: MaterializedNode | null = origin; node; node = node.parent) {
      if (isFrameNode(node)) chain.push(node);
    }
    return Object.freeze(chain);
  }

  roots(): readonly MaterializedNode[] {
    return Object.freeze([...this.rootsBySlot.values()]);
  }

  private detach(node: MaterializedNode): void {
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

/** Current structural Angular view/frame scope used for FrameOutlet ownership. */
export const CURRENT_VIEW_NODE = new InjectionToken<MaterializedNode>('CURRENT_VIEW_NODE');

/** Nearest authored frame scope. Structural ViewNodes do not provide this token. */
export const CURRENT_FRAME_NODE = new InjectionToken<FrameNode>('CURRENT_FRAME_NODE');
