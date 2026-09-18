import { FrameTree, type MaterializedNode } from '../lib/frame-tree';

describe('materialized FrameTree', () => {
  function host(): HTMLElement { return document.createElement('frame-host'); }
  function outlet(name = ''): HTMLElement {
    const element = document.createElement('frame-outlet');
    if (name) element.setAttribute('name', name);
    return element;
  }

  function connect(tree: FrameTree, element: HTMLElement, owner: MaterializedNode | null, name = ''): HTMLElement {
    tree.registerOutlet(name, element, owner);
    return element;
  }

  it('models named outlets as logical children of their visible owner', () => {
    const tree = new FrameTree();
    const workspaceHost = host();
    const workspace = tree.create('workspace', workspaceHost);
    const root = outlet();
    tree.registerOutlet('', root, null);
    tree.mount(workspace, root);

    const sidebar = tree.create('books-sidebar', host());
    const primary = tree.create('books', host());
    tree.mount(sidebar, connect(tree, outlet('sidebar'), workspace, 'sidebar'));
    tree.mount(primary, connect(tree, outlet(), workspace));

    expect(workspace.children.get('sidebar')).toBe(sidebar);
    expect(workspace.children.get('')).toBe(primary);
    expect(tree.bubble(primary).map(node => node.frameId)).toEqual(['books', 'workspace']);
    expect(tree.bubble(sidebar).map(node => node.frameId)).toEqual(['books-sidebar', 'workspace']);
  });

  it('keeps duplicate definitions distinct by materialized node identity', () => {
    const tree = new FrameTree();
    const a = tree.create('editor', host());
    const b = tree.create('editor', host());
    expect(a.key).not.toBe(b.key);
    expect(a.frameId).toBe(b.frameId);
  });

  it('replaces only the mounted slot and preserves sibling branches', () => {
    const tree = new FrameTree();
    const rootHost = host();
    const root = tree.create('workspace', rootHost);
    const appOutlet = connect(tree, outlet(), null);
    tree.mount(root, appOutlet);
    const sidebarOutlet = connect(tree, outlet('sidebar'), root, 'sidebar');
    const primaryOutlet = connect(tree, outlet(), root);
    const sidebar = tree.create('sidebar', host());
    const books = tree.create('books', host());
    tree.mount(sidebar, sidebarOutlet);
    tree.mount(books, primaryOutlet);

    const journal = tree.create('journal', host());
    tree.mount(journal, primaryOutlet);

    expect(root.children.get('sidebar')).toBe(sidebar);
    expect(root.children.get('')).toBe(journal);
    expect(books.parent).toBeNull();
    expect(tree.bubble(books)).toEqual([]);
  });

  it('removes an entire replaced branch from the materialized tree', () => {
    const tree = new FrameTree();
    const workspaceHost = host();
    const workspace = tree.create('workspace', workspaceHost);
    const appOutlet = connect(tree, outlet(), null);
    tree.mount(workspace, appOutlet);

    const booksHost = host();
    const books = tree.create('books', booksHost);
    const workspacePrimary = connect(tree, outlet(), workspace);
    tree.mount(books, workspacePrimary);
    const details = tree.create('details', host());
    tree.mount(details, connect(tree, outlet(), books));

    const journal = tree.create('journal', host());
    tree.mount(journal, workspacePrimary);

    expect(workspace.children.get('')).toBe(journal);
    expect(tree.bubble(books)).toEqual([]);
    expect(tree.bubble(details)).toEqual([]);
    expect(books.children.size).toBe(0);
  });

  it('removes outlets owned by a removed branch immediately', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const root = tree.create('root', host());
    tree.mount(root, app);
    const primary = connect(tree, outlet(), root);
    const sidebar = connect(tree, outlet('sidebar'), root, 'sidebar');

    const child = tree.create('child', host());
    tree.mount(child, primary);
    connect(tree, outlet('details'), child, 'details');

    expect(tree.outletCount).toBe(4);
    expect(tree.hasOutlet(sidebar)).toBeTrue();

    tree.remove(root);

    expect(tree.outletCount).toBe(1);
    expect(tree.hasOutlet(sidebar)).toBeFalse();
    expect(tree.outlet('')).toBe(app);
    expect(tree.outlet('sidebar')).toBeNull();
    expect(tree.outlet('details')).toBeNull();
    expect(tree.bubble(child)).toEqual([]);
  });

  it('identifies outlet ownership from the materialized frame tree', () => {
    const tree = new FrameTree();
    const rootHost = document.createElement('frame-host');
    const root = tree.create('root', rootHost);
    const rootOutlet = document.createElement('frame-outlet');
    rootHost.appendChild(rootOutlet);
    const appOutlet = document.createElement('frame-outlet');
    tree.registerOutlet('', appOutlet, null);
    tree.mount(root, appOutlet);
    tree.registerOutlet('', rootOutlet, root);

    expect(tree.ownerOf(rootOutlet)).toBe(root);
    expect(tree.depth(root)).toBe(0);

    const childHost = document.createElement('frame-host');
    const child = tree.create('child', childHost);
    tree.mount(child, rootOutlet);
    const childOutlet = document.createElement('frame-outlet');
    childHost.appendChild(childOutlet);
    tree.registerOutlet('', childOutlet, child);

    expect(tree.ownerOf(childOutlet)).toBe(child);
    expect(tree.depth(child)).toBe(1);

    tree.remove(child);
    expect(tree.depth(child)).toBe(-1);
  });

  it('resolves duplicate outlet names by visible-tree ownership rather than registration order', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);
    const root = tree.create('root', host());
    tree.mount(root, app);

    const rootSidebar = outlet('sidebar');
    tree.registerOutlet('sidebar', rootSidebar, root);
    const child = tree.create('child', host());
    const primary = outlet();
    tree.registerOutlet('', primary, root);
    tree.mount(child, primary);

    const childSidebar = outlet('sidebar');
    tree.registerOutlet('sidebar', childSidebar, child);
    expect(tree.outlet('sidebar')).toBe(childSidebar);

    tree.remove(child);
    expect(tree.outlet('sidebar')).toBe(rootSidebar);
  });

  it('does not resolve outlets owned by a frame until that frame is mounted', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const oldRoot = tree.create('old-root', host());
    tree.mount(oldRoot, app);
    const oldSidebar = outlet('sidebar');
    tree.registerOutlet('sidebar', oldSidebar, oldRoot);

    // Angular can instantiate the incoming component (and therefore connect
    // its outlets) before VanillaRouter commits its host into the DOM/tree.
    const incoming = tree.create('incoming', host());
    const incomingSidebar = outlet('sidebar');
    tree.registerOutlet('sidebar', incomingSidebar, incoming);

    expect(tree.isMaterialized(incoming)).toBeFalse();
    expect(tree.outlet('sidebar')).toBe(oldSidebar);

    tree.mount(incoming, app);
    expect(tree.isMaterialized(incoming)).toBeTrue();
    expect(tree.outlet('sidebar')).toBe(incomingSidebar);
  });

  it('builds detached layout ancestry without exposing its outlets until the root is mounted', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const layout = tree.create('layout', host());
    const layoutPrimary = outlet();
    tree.registerOutlet('', layoutPrimary, layout);

    const child = tree.create('child', host());
    tree.mount(child, layoutPrimary);

    expect(child.parent).toBe(layout);
    expect(layout.children.get('')).toBe(child);
    expect(tree.isMaterialized(layout)).toBeFalse();
    expect(tree.isMaterialized(child)).toBeFalse();
    expect(tree.outlet('')).toBe(app);

    tree.mount(layout, app);

    expect(tree.isMaterialized(layout)).toBeTrue();
    expect(tree.isMaterialized(child)).toBeTrue();
    expect(tree.outlet('')).toBe(layoutPrimary);
  });

  it('uses Angular ViewNodes as structural outlet owners without turning them into frames', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const rootFrame = tree.createFrame('workspace', host(), ['settings']);
    tree.mount(rootFrame, app);

    const framePrimary = connect(tree, outlet(), rootFrame);
    const angularView = tree.createView(host());
    tree.mount(angularView, framePrimary);

    const viewPrimary = connect(tree, outlet(), angularView);
    const child = tree.createFrame('settings', host());
    tree.mount(child, viewPrimary);

    expect(tree.ownerOf(viewPrimary)).toBe(angularView);
    expect(angularView.kind).toBe('view');
    expect(child.parent).toBe(angularView);
    expect(tree.ancestry(child)).toEqual([child, angularView, rootFrame]);
    expect(tree.bubble(child)).toEqual([child, rootFrame]);
  });

  it('keeps detached Angular view scopes hidden until their root is materialized', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const angularView = tree.createView(host());
    const primary = connect(tree, outlet(), angularView);
    const child = tree.createFrame('settings', host());
    tree.mount(child, primary);

    expect(tree.isMaterialized(angularView)).toBeFalse();
    expect(tree.isMaterialized(child)).toBeFalse();
    expect(tree.outlet('')).toBe(app);

    tree.mount(angularView, app);

    expect(tree.isMaterialized(angularView)).toBeTrue();
    expect(tree.isMaterialized(child)).toBeTrue();
    expect(tree.outlet('')).toBe(primary);
  });


  it('rejects registering an outlet for a node from outside the tree', () => {
    const tree = new FrameTree();
    const otherTree = new FrameTree();
    const foreignOwner = otherTree.create('foreign', host());

    expect(() => tree.registerOutlet('', outlet(), foreignOwner)).toThrowError(/not part of this FrameTree/);
    expect(tree.outletCount).toBe(0);
  });

  it('rejects a forged relay origin that only reuses a live node key', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const live = tree.create('live', host());
    tree.mount(live, app);

    const forged = {
      ...live,
      host: host(),
      children: new Map(live.children),
    };

    expect(tree.bubble(forged)).toEqual([]);
    expect(tree.bubble(live)).toEqual([live]);
  });

  it('rejects remounting a removed node', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const node = tree.create('screen', host());
    tree.mount(node, app);
    tree.remove(node);

    expect(() => tree.mount(node, app)).toThrowError(/not part of this FrameTree/);
    expect(tree.roots()).toEqual([]);
  });

  it('rejects mounting a node into an outlet owned by its descendant', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const parent = tree.create('parent', host());
    tree.mount(parent, app);
    const parentPrimary = connect(tree, outlet(), parent);

    const child = tree.create('child', host());
    tree.mount(child, parentPrimary);
    const childPrimary = connect(tree, outlet(), child);

    expect(() => tree.mount(parent, childPrimary)).toThrowError(/itself or its descendant/);
    expect(parent.parent).toBeNull();
    expect(parent.children.get('')).toBe(child);
    expect(child.parent).toBe(parent);
  });

  it('rejects mounting into an unconnected outlet', () => {
    const tree = new FrameTree();
    const node = tree.create('screen', host());

    expect(() => tree.mount(node, outlet())).toThrowError(/not connected/);
    expect(tree.roots()).toEqual([]);
  });

});
