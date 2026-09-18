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
});
