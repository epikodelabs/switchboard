import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  frame,
  layout,
  view,
  redirect,
  provideFrameGraph,
  FrameOutlet,
  s,
  FrameRuntime,
  FRAME_TREE,
  NavigationTree,
} from '@epikodelabs/switchboard';

ensureAngularTestEnvironment();

@Component({ standalone: true, template: '<h1>Home</h1>' })
class HomeComponent {}

@Component({
  standalone: true,
  imports: [FrameOutlet],
  template: '<h2>Parent</h2><frame-outlet />',
  host: { 'parent-cmp': '' },
})
class ParentComponent {}

@Component({
  standalone: true,
  imports: [FrameOutlet],
  template: '<h2>Shell</h2><frame-outlet />',
  host: { 'shell-cmp': '' },
})
class ShellComponent {}

@Component({
  standalone: true,
  imports: [FrameOutlet],
  template: '<h2>Shell</h2><frame-outlet name="sidebar" /><frame-outlet />',
  host: { 'shell-sidebar-cmp': '' },
})
class ShellWithSidebarComponent {}

@Component({
  standalone: true,
  template: '<h3>Child</h3>',
  host: { 'child-cmp': '' },
})
class ChildComponent {}

@Component({
  standalone: true,
  template: '<h3>Settings</h3>',
  host: { 'settings-cmp': '' },
})
class SettingsComponent {}

@Component({
  standalone: true,
  template: '<h2>Broken parent</h2>',
})
class ParentWithoutOutletComponent {}

@Component({
  standalone: true,
  imports: [FrameOutlet],
  template: '<frame-outlet />',
})
class ChildWithOutletComponent {}

@Component({ standalone: true, template: '' })
class ThrowingComponent {
  constructor() {
    throw new Error('construction failed');
  }
}

describe('FrameRuntime: nested frames', () => {
  it('supports layout() and view() as equivalent Angular view composition helpers', () => {
    const legacy = layout('/legacy', ParentComponent, [frame('legacy-child', '/child', ChildComponent)]);
    const preferred = view('/legacy', ParentComponent, [frame('legacy-child', '/child', ChildComponent)]);

    expect(legacy.kind).toBe('layout');
    expect(legacy.path).toBe(preferred.path);
    expect(legacy.layout.length).toBe(preferred.layout.length);
  });

  let outlet: HTMLElement;
  let navigator: FrameRuntime;

  function bootstrap(routes: NavigationTree): void {
    TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        ParentComponent,
        ShellComponent,
        ShellWithSidebarComponent,
        ChildComponent,
        SettingsComponent,
        ParentWithoutOutletComponent,
        ChildWithOutletComponent,
        ThrowingComponent,
      ],
      providers: [...provideFrameGraph(routes)],
    });

    outlet = document.createElement('div');
    navigator = TestBed.inject(FrameRuntime);
    navigator.connect('', outlet);
  }

  function getOutletContent(): string {
    return outlet.innerHTML;
  }

  async function navigate(path: string): Promise<void> {
    await navigator.navigate({ path });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function settleInitialNavigation(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    spyOn(window.history, 'pushState').and.callThrough();
    spyOn(window.history, 'replaceState').and.callThrough();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    navigator?.dispose();
    outlet?.remove();
  });

  it('renders a leaf route without a layout', async () => {
    const routes = [frame('home', '/', HomeComponent)] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/');

    expect(getOutletContent()).toContain('<h1>Home</h1>');
  });

  it('supports a layout index route', async () => {
    const routes = [
      view('/admin', ParentComponent, [frame('home', '', HomeComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h1>Home</h1>');
  });

  it('renders an eager layout around an eager leaf route', async () => {
    const routes = [
      view('/admin', ParentComponent, [frame('child', '/child', ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('inherits the layout path prefix', async () => {
    const routes = [
      view('/admin', ParentComponent, [frame('settings', '/settings', SettingsComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/settings');

    expect(getOutletContent()).toContain('<h3>Settings</h3>');
    expect(navigator.state.path).toBe('/admin/settings');
  });

  it('renders an eager layout around a lazy leaf route', async () => {
    const routes = [
      view('/admin', ParentComponent, [frame('lazy-child', '/lazy-child', async () => ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/lazy-child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders a lazy layout around an eager leaf route', async () => {
    const routes = [
      view('/admin', async () => ParentComponent, [frame('child', '/child', ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders a lazy layout around a lazy leaf route', async () => {
    const routes = [
      view('/admin', async () => ParentComponent, [
        frame('lazy-child', '/lazy-child', async () => ChildComponent),
      ]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/lazy-child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('composes multiple layouts without creating a route hierarchy', async () => {
    const routes = [
      view('/app', ShellComponent, [
        view('/admin', ParentComponent, [frame('child', '/child', ChildComponent)]),
      ]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/app/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('supports multiple leaf routes inside one prefixed layout', async () => {
    const routes = [
      view('/admin', ParentComponent, [
        frame('child', '/child', ChildComponent),
        frame('settings', '/settings', SettingsComponent),
      ]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);

    await navigate('/admin/child');
    expect(getOutletContent()).toContain('<h3>Child</h3>');

    await navigate('/admin/settings');
    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Settings</h3>');
    expect(content).not.toContain('<h3>Child</h3>');
  });

  it('supports named outlets', async () => {
    const routes = [
      view('/', ParentComponent, [
        frame('home', '', HomeComponent, {
          outlets: { sidebar: SettingsComponent },
        }),
      ]),
    ] as const satisfies NavigationTree;

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.id = 'sidebar-outlet';

    bootstrap(routes);
    navigator.connect('sidebar', sidebarOutlet);

    await navigate('/');
    const content = getOutletContent();
    expect(content).toContain('<h1>Home</h1>');
    expect(sidebarOutlet.innerHTML).toContain('<h3>Settings</h3>');

    navigator.disconnect('sidebar', sidebarOutlet);
  });

  it('connects named outlets declared inside a layout component', async () => {
    const routes = [
      view('/app', ShellWithSidebarComponent, [
        frame('child', '/child', ChildComponent, {
          outlets: { sidebar: SettingsComponent },
        }),
      ]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/app/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(content).toContain('<h3>Settings</h3>');
  });

  it('composes addressable frames directly inside a layout', async () => {
    const childFrame = frame('child', '/child', ChildComponent, {
      outlets: { sidebar: SettingsComponent },
    });

    const routes = [
      view('/app', ShellWithSidebarComponent, [childFrame]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/app/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(content).toContain('<h3>Settings</h3>');
  });

  it('binds the frame id as the placed route name', async () => {
    const childFrame = frame('child', '/child', ChildComponent, {
      directEntry: true,
    });

    const routes = [
      view('/app', ShellComponent, [childFrame]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);

    await navigator.navigate({ name: 'child' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(navigator.state.path).toBe('/app/child');
  });

  it('keeps named outlet navigation working across layout re-renders', async () => {
    const routes = [
      view('/app', ShellWithSidebarComponent, [
        frame('child', '/child', ChildComponent, {
          outlets: { sidebar: SettingsComponent },
        }),
        frame('settings', '/settings', SettingsComponent, {
          outlets: { sidebar: HomeComponent },
        }),
      ]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);

    await navigate('/app/child');
    expect(getOutletContent()).toContain('<h3>Child</h3>');
    expect(getOutletContent()).toContain('<h3>Settings</h3>');

    await navigate('/app/settings');

    const content = getOutletContent();
    expect(content).toContain('<h3>Settings</h3>');
    expect(content).toContain('<h1>Home</h1>');
    expect(navigator.state.path).toBe('/app/settings');
  });

  it('redirects direct address-bar entry when a frame disallows direct entry', async () => {
    const landingFrame = frame('landing', '/landing/:projectId', HomeComponent, {
      params: {
        projectId: s.number({ min: 1 }),
      },
      directEntry: true,
      transitions: ['private'],
    });
    const privateFrame = frame('private', '/private', ChildComponent, {
      transitions: [],
      directEntryRedirectTo: '/landing/7',
    });
    const routes = [
      landingFrame,
      privateFrame,
    ] as const satisfies NavigationTree;

    window.history.replaceState(null, '', '/private');

    bootstrap(routes);
    await settleInitialNavigation();

    expect(navigator.state.path).toBe('/landing/7');
    expect(getOutletContent()).toContain('<h1>Home</h1>');
  });

  it('allows direct entry through redirect routes that canonicalize into a frame', async () => {
    const landingFrame = frame('landing', '/landing', HomeComponent, {
      directEntry: true,
      transitions: ['workspace'],
    });
    const workspaceFrame = frame('workspace', '/workspace', ChildComponent, {
      transitions: [],
    });
    const routes = [
      landingFrame,
      redirect('/legacy', workspaceFrame),
      workspaceFrame,
    ] as const;

    window.history.replaceState(null, '', '/legacy');

    bootstrap(routes);
    await settleInitialNavigation();

    expect(navigator.state.path).toBe('/workspace');
    expect(window.location.pathname).toBe('/workspace');
    expect(getOutletContent()).toContain('<h3>Child</h3>');
  });

  it('keeps internal address navigation independent from frame relay transitions', async () => {
    const publicFrame = frame('public', '/public', HomeComponent, {
      directEntry: true,
      transitions: ['private'],
    });
    const privateFrame = frame('private', '/private', ChildComponent, {
      transitions: ['public'],
    });
    const routes = [
      publicFrame,
      privateFrame,
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/public');
    await navigate('/private');

    expect(navigator.state.path).toBe('/private');
    expect(getOutletContent()).toContain('<h3>Child</h3>');
  });

  it('supports redirect targets in frame guards', async () => {
    const settingsFrame = frame('settings', '/settings', SettingsComponent, {
      query: {
        section: s.string('general'),
      },
    });
    const adminFrame = frame(
      'admin',
      '/admin',
      ChildComponent,
      {
        beforeEnter: [
          () => ({
            redirectTo: '/settings?section=access',
            replace: true,
          }),
        ],
      },
    );
    const routes = [
      settingsFrame,
      adminFrame,
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin');

    expect(navigator.state.path).toBe('/settings');
    expect(navigator.state.query['section']).toBe('access');
    expect(getOutletContent()).toContain('<h3>Settings</h3>');
  });

  it('rolls back a created child layer when parent composition fails', async () => {
    const routes = [
      view('/broken', ParentWithoutOutletComponent, [
        frame('nested', '/child', ChildWithOutletComponent),
      ]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    const tree = TestBed.inject(FRAME_TREE);
    expect(tree.outletCount).toBe(1);

    await expectAsync(
      navigator.navigate({ path: '/broken/child' }),
    ).toBeRejectedWithError(
      Error,
      /parent layout has no frame outlet \(primary\)/,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getOutletContent()).toContain('Page failed to load');
    expect(tree.outletCount).toBe(1);
    expect(tree.roots().length).toBe(0);
  });

  it('removes a structural node when component creation fails', async () => {
    const routes = [frame('broken', '/broken', ThrowingComponent)] as const satisfies NavigationTree;

    bootstrap(routes);
    const tree = TestBed.inject(FRAME_TREE);
    const createdNodes: ReturnType<typeof tree.createFrame>[] = [];
    const createFrame = tree.createFrame.bind(tree);
    spyOn(tree, 'createFrame').and.callFake((frameId, host, transitions) => {
      const node = createFrame(frameId, host, transitions);
      createdNodes.push(node);
      return node;
    });

    await expectAsync(
      navigator.navigate({ path: '/broken' }),
    ).toBeRejectedWithError(Error, 'construction failed');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getOutletContent()).toContain('Page failed to load');
    expect(createdNodes.length).toBeGreaterThan(0);
    expect(createdNodes.every((node) => !tree.contains(node))).toBeTrue();
    expect(tree.roots().length).toBe(0);
  });

  it('restores a frame from browser history state', async () => {
    const childFrame = frame('child', '/child', ChildComponent, {
      directEntry: true,
    });
    const routes = [
      view('/app', ShellComponent, [childFrame]),
    ] as const satisfies NavigationTree;

    window.history.replaceState(
      {
        __aether_switchboard__: {
          userState: {
            source: 'restore',
          },
          matchHref: '/app/child',
        },
      },
      '',
      '/app/child',
    );

    bootstrap(routes);
    await settleInitialNavigation();

    expect(getOutletContent()).toContain('<h3>Child</h3>');
    expect(navigator.state.historyState).toEqual({
      source: 'restore',
    });
    expect(navigator.displayUrl).toBe('/app/child');
    expect(window.location.pathname).toBe('/app/child');
  });
});

describe('FrameRuntime async facade methods', () => {
  let navigator: FrameRuntime;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState(null, '', '/');
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [...provideFrameGraph([frame('home', '/', HomeComponent)])],
    });
    navigator = TestBed.inject(FrameRuntime);
  });

  afterEach(() => {
    navigator?.dispose();
  });

  it('rejects navigate when no outlet is active', async () => {
    await expectAsync(
      navigator.navigate({ path: '/' }),
    ).toBeRejectedWithError('Frame navigator has no active outlet.');
  });

  it('rejects revalidate when no outlet is active', async () => {
    await expectAsync(
      navigator.revalidate(),
    ).toBeRejectedWithError('Frame navigator has no active outlet.');
  });

  it('rejects preload when no outlet is active', async () => {
    await expectAsync(
      navigator.preload(),
    ).toBeRejectedWithError('Frame navigator has no active outlet.');
  });
});
