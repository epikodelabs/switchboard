import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  frame,
  layout,
  redirect,
  provideFrameGraph,
  FrameOutlet,
  s,
  FrameNavigator,
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

describe('FrameNavigator: nested frames', () => {
  let outlet: HTMLElement;
  let navigator: FrameNavigator;

  function bootstrap(routes: NavigationTree): void {
    TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        ParentComponent,
        ShellComponent,
        ShellWithSidebarComponent,
        ChildComponent,
        SettingsComponent,
      ],
      providers: [...provideFrameGraph(routes)],
    });

    outlet = document.createElement('div');
    navigator = TestBed.inject(FrameNavigator);
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
      layout('/admin', ParentComponent, [frame('home', '', HomeComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h1>Home</h1>');
  });

  it('renders an eager layout around an eager leaf route', async () => {
    const routes = [
      layout('/admin', ParentComponent, [frame('child', '/child', ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('inherits the layout path prefix', async () => {
    const routes = [
      layout('/admin', ParentComponent, [frame('settings', '/settings', SettingsComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/settings');

    expect(getOutletContent()).toContain('<h3>Settings</h3>');
    expect(navigator.state.path).toBe('/admin/settings');
  });

  it('renders an eager layout around a lazy leaf route', async () => {
    const routes = [
      layout('/admin', ParentComponent, [frame('lazy-child', '/lazy-child', async () => ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/lazy-child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders a lazy layout around an eager leaf route', async () => {
    const routes = [
      layout('/admin', async () => ParentComponent, [frame('child', '/child', ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders a lazy layout around a lazy leaf route', async () => {
    const routes = [
      layout('/admin', async () => ParentComponent, [
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
      layout('/app', ShellComponent, [
        layout('/admin', ParentComponent, [frame('child', '/child', ChildComponent)]),
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
      layout('/admin', ParentComponent, [
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
      layout('/', ParentComponent, [
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
      layout('/app', ShellWithSidebarComponent, [
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
      layout('/app', ShellWithSidebarComponent, [childFrame]),
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
      layout('/app', ShellComponent, [childFrame]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);

    await navigator.navigate({ name: 'child' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(navigator.state.path).toBe('/app/child');
  });

  it('accepts frame targets and places them at their authored path', async () => {
    const childFrame = frame('child', '/child', ChildComponent, {
      directEntry: true,
    });

    const routes = [
      layout('/app', ShellComponent, [childFrame]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);

    await navigator.navigate({
      frame: 'child',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(window.location.pathname).toBe('/app/child');
  });

  it('keeps named outlet navigation working across layout re-renders', async () => {
    const routes = [
      layout('/app', ShellWithSidebarComponent, [
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

  it('allows declared frame-to-frame transitions after initial entry', async () => {
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

  it('accepts frame targets and carries payload through navigation state', async () => {
    const settingsFrame = frame('settings', '/settings', SettingsComponent, {
      directEntry: true,
    });
    const routes = [settingsFrame] as const;

    bootstrap(routes);

    await navigator.navigate({
      frame: 'settings',
      payload: {
        source: 'menu',
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigator.state.path).toBe('/settings');
    expect(navigator.state.historyState).toEqual({
      source: 'menu',
    });
    expect(navigator.displayUrl).toBe('/settings');
  });

  it('restores a frame from browser history state', async () => {
    const childFrame = frame('child', '/child', ChildComponent, {
      directEntry: true,
    });
    const routes = [
      layout('/app', ShellComponent, [childFrame]),
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

describe('FrameNavigator async facade methods', () => {
  let navigator: FrameNavigator;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState(null, '', '/');
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [...provideFrameGraph([frame('home', '/', HomeComponent)])],
    });
    navigator = TestBed.inject(FrameNavigator);
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


