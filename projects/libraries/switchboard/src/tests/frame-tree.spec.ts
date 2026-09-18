import { FrameTree } from '../lib/frame-tree';

describe('materialized FrameTree', () => {
  function host(): HTMLElement { return document.createElement('frame-host'); }
  function outlet(owner?: HTMLElement, name = ''): HTMLElement {
    const element = document.createElement('frame-outlet');
    if (name) element.setAttribute('name', name);
    owner?.appendChild(element);
    return element;
  }

  it('models named outlets as logical children of their visible owner', () => {
    const tree = new FrameTree();
    const workspaceHost = host();
    const workspace = tree.create('workspace', workspaceHost);
    const root = outlet();
    tree.mount(workspace, root);

    const sidebar = tree.create('books-sidebar', host());
    const primary = tree.create('books', host());
    tree.mount(sidebar, outlet(workspaceHost, 'sidebar'));
    tree.mount(primary, outlet(workspaceHost));

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
    tree.mount(root, outlet());
    const sidebarOutlet = outlet(rootHost, 'sidebar');
    const primaryOutlet = outlet(rootHost);
    const sidebar = tree.create('sidebar', host());
    const books = tree.create('books', host());
    tree.mount(sidebar, sidebarOutlet);
    tree.mount(books, primaryOutlet);

    const journal = tree.create('journal', host());
    tree.mount(journal, primaryOutlet);

    expect(root.children.get('sidebar')).toBe(sidebar);
    expect(root.children.get('')).toBe(journal);
    expect(books.parent).toBeNull();
  });
  describe('tree-native navigation projection', () => {
    it('replaces only the branch through which a relay bubbled', () => {
      const tree = new FrameTree();
      const workspaceHost = host();
      const workspace = tree.create('workspace', workspaceHost);
      tree.mount(workspace, outlet());

      const sidebar = tree.create('sidebar', host());
      tree.mount(sidebar, outlet(workspaceHost, 'sidebar'));

      const booksHost = host();
      const books = tree.create('books', booksHost);
      tree.mount(books, outlet(workspaceHost));
      const details = tree.create('details', host());
      tree.mount(details, outlet(booksHost));

      const projection = tree.project(details, workspace, 'journal');
      expect(projection).not.toBeNull();
      expect(projection!.acceptedBy).toBe(workspace);
      expect(projection!.parent).toBe(workspace);
      expect(projection!.slot).toBe('');
      expect(projection!.current).toBe(books);

      const diff = tree.reconcile(projection!);
      expect(diff.keep).toContain(workspace);
      expect(diff.keep).toContain(sidebar);
      expect(diff.leave).toEqual([books, details]);
      expect(diff.enteringFrameId).toBe('journal');
    });

    it('replaces the origin itself when the origin accepts a peer transition', () => {
      const tree = new FrameTree();
      const workspaceHost = host();
      const workspace = tree.create('workspace', workspaceHost);
      tree.mount(workspace, outlet());
      const books = tree.create('books', host());
      tree.mount(books, outlet(workspaceHost));

      const projection = tree.project(books, books, 'journal')!;
      expect(projection.acceptedBy).toBe(books);
      expect(projection.parent).toBe(workspace);
      expect(projection.current).toBe(books);
      const diff = tree.reconcile(projection);
      expect(diff.leave).toEqual([books]);
      expect(diff.enteringFrameId).toBe('journal');
      expect(diff.keep).toContain(workspace);
    });

    it('turns navigation to the already materialized branch root into KEEP', () => {
      const tree = new FrameTree();
      const workspaceHost = host();
      const workspace = tree.create('workspace', workspaceHost);
      tree.mount(workspace, outlet());
      const books = tree.create('books', host());
      tree.mount(books, outlet(workspaceHost));

      const projection = tree.project(books, workspace, 'books')!;
      const diff = tree.reconcile(projection);
      expect(diff.leave).toEqual([]);
      expect(diff.enteringFrameId).toBeNull();
      expect(diff.keep).toContain(books);
    });
  });
});
