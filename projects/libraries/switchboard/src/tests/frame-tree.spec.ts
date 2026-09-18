import { FrameTree } from '../lib/frame-tree';

describe('materialized FrameTree', () => {
  function host(): HTMLElement { return document.createElement('frame-host'); }
  function outlet(name = ''): HTMLElement {
    const element = document.createElement('frame-outlet');
    if (name) element.setAttribute('name', name);
    return element;
  }

  function connect(tree: FrameTree, element: HTMLElement, owner: ReturnType<FrameTree['create']> | null, name = ''): HTMLElement {
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

  it('uses anonymous rendered layouts as structural outlet owners', () => {
    const tree = new FrameTree();
    const app = outlet();
    tree.registerOutlet('', app, null);

    const layout = tree.create(null, host());
    const layoutPrimary = outlet();
    tree.registerOutlet('', layoutPrimary, layout);

    const child = tree.create('settings', host());
    tree.mount(child, layoutPrimary);

    expect(tree.ownerOf(layoutPrimary)).toBe(layout);
    expect(child.parent).toBe(layout);
    expect(layout.frameId).toBeNull();
    expect(tree.outlet('', layout.host)).toBe(app);

    tree.mount(layout, app);

    expect(tree.isMaterialized(layout)).toBeTrue();
    expect(tree.isMaterialized(child)).toBeTrue();
  });

});
