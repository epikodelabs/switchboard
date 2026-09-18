import { InjectionToken } from '@angular/core';

export interface FrameNode {
  readonly key: number;
  readonly frameId: string;
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

  create(frameId: string, host: HTMLElement, transitions: readonly string[] = []): FrameNode {
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
    this.outlets.set(outlet, {
      name: name.trim(),
      owner,
      order: this.nextOutletOrder++,
    });
  }

  unregisterOutlet(outlet: HTMLElement): void {
    this.outlets.delete(outlet);
  }

  get outletCount(): number {
    return this.outlets.size;
  }

  ownerOf(outlet: HTMLElement): FrameNode | null {
    const owner = this.outlets.get(outlet)?.owner ?? null;
    return owner && this.contains(owner) ? owner : null;
  }

  /** Resolve a named outlet in the currently materialized tree. */
  outlet(name: string): HTMLElement | null {
    const targetName = name.trim();
    let selected: { readonly element: HTMLElement; readonly depth: number; readonly order: number } | null = null;

    for (const [element, record] of this.outlets) {
      if (record.name !== targetName) continue;
      const depth = record.owner ? this.depth(record.owner) : 0;
      if (record.owner && depth < 0) continue;
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

  /** Mount a materialized frame into a concrete outlet. */
  mount(node: FrameNode, outlet: HTMLElement, slot = outlet.getAttribute('name')?.trim() ?? ''): void {
    this.detach(node);
    const owner = this.ownerOf(outlet);
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
