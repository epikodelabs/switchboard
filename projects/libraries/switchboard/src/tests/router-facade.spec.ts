import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  address,
  frame,
  frameOutlet,
  frameRoute,
  layout,
  lazyLayout,
  lazyRoute,
  navigation,
  redirectRoute,
  route,
  provideRouter,
  RouterOutlet,
  s,
  Router,
  type NavigationSource,
  view,
} from '@epikodelabs/switchboard';

ensureAngularTestEnvironment();

@Component({ standalone: true, template: '<h1>Home</h1>' })
class HomeComponent {}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<h2>Parent</h2><router-outlet />',
  host: { 'parent-cmp': '' },
})
class ParentComponent {}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<h2>Shell</h2><router-outlet />',
  host: { 'shell-cmp': '' },
})
class ShellComponent {}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<h2>Shell</h2><router-outlet name="sidebar" /><router-outlet />',
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

describe('Router: flat routes and layouts', () => {
  let outlet: HTMLElement;
  let router: Router;

  function bootstrap(routes: NavigationSource): void {
    TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        ParentComponent,
        ShellComponent,
        ShellWithSidebarComponent,
        ChildComponent,
        SettingsComponent,
      ],
      providers: [...provideRouter(routes)],
    });

    outlet = document.createElement('div');
    router = TestBed.inject(Router);
    router.connect('', outlet);
  }

  function getOutletContent(): string {
    return outlet.innerHTML;
  }

  async function navigate(path: string): Promise<void> {
    await router.navigate({ path });
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
    router?.dispose();
    outlet?.remove();
  });

  it('renders a leaf route without a layout', async () => {
    const routes = [route('/', HomeComponent)] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/');

    expect(getOutletContent()).toContain('<h1>Home</h1>');
  });

  it('supports a layout index route', async () => {
    const routes = [
      layout('/admin', ParentComponent, [route('', HomeComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h1>Home</h1>');
  });

  it('renders an eager layout around an eager leaf route', async () => {
    const routes = [
      layout('/admin', ParentComponent, [route('/child', ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('inherits the layout path prefix', async () => {
    const routes = [
      layout('/admin', ParentComponent, [route('/settings', SettingsComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/settings');

    expect(getOutletContent()).toContain('<h3>Settings</h3>');
    expect(router.state.path).toBe('/admin/settings');
  });

  it('renders an eager layout around a lazy leaf route', async () => {
    const routes = [
      layout('/admin', ParentComponent, [lazyRoute('/lazy-child', async () => ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/lazy-child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders a lazy layout around an eager leaf route', async () => {
    const routes = [
      lazyLayout('/admin', async () => ParentComponent, [route('/child', ChildComponent)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Parent</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders a lazy layout around a lazy leaf route', async () => {
    const routes = [
      lazyLayout('/admin', async () => ParentComponent, [
        lazyRoute('/lazy-child', async () => ChildComponent),
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
        layout('/admin', ParentComponent, [route('/child', ChildComponent)]),
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
        route('/child', ChildComponent),
        route('/settings', SettingsComponent),
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
        route('', HomeComponent),
        route('', SettingsComponent, { outlet: 'sidebar' }),
      ]),
    ] as const satisfies NavigationTree;

    const sidebarOutlet = document.createElement('div');
    sidebarOutlet.id = 'sidebar-outlet';

    bootstrap(routes);
    router.connect('sidebar', sidebarOutlet);

    await navigate('/');
    const content = getOutletContent();
    expect(content).toContain('<h1>Home</h1>');
    expect(sidebarOutlet.innerHTML).toContain('<h3>Settings</h3>');

    router.disconnect('sidebar', sidebarOutlet);
  });

  it('connects named outlets declared inside a layout component', async () => {
    const routes = [
      layout('/app', ShellWithSidebarComponent, [
        route('/child', ChildComponent),
        route('/child', SettingsComponent, { outlet: 'sidebar' }),
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
    const childFrame = frame('child', view(ChildComponent), {
      outlets: [frameOutlet('sidebar', view(SettingsComponent))],
    });

    const routes = [
      layout('/app', ShellWithSidebarComponent, [route('/child', childFrame)]),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/app/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(content).toContain('<h3>Settings</h3>');
  });

  it('supports declared navigation definitions with explicit addresses', async () => {
    const childFrame = frame('child', view(ChildComponent), {
      directEntry: true,
    });

    const routes = navigation({
      frames: [childFrame] as const,
      entries: [layout('/app', ShellComponent, [address('/child', childFrame)])] as const,
    });

    bootstrap(routes);
    await navigate('/app/child');

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
  });

  it('renders an internal-only frame placed inside a layout', async () => {
    const childFrame = frame('child', view(ChildComponent), {
      directEntry: true,
    });

    const routes = navigation({
      frames: [childFrame] as const,
      entries: [layout('/app', ShellComponent, [childFrame])] as const,
    });

    bootstrap(routes);

    await router.navigate({
      frame: 'child',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = getOutletContent();
    expect(content).toContain('<h2>Shell</h2>');
    expect(content).toContain('<h3>Child</h3>');
    expect(window.location.pathname).toBe('/');
  });

  it('keeps named outlet navigation working across layout re-renders', async () => {
    const routes = [
      layout('/app', ShellWithSidebarComponent, [
        route('/child', ChildComponent),
        route('/child', SettingsComponent, { outlet: 'sidebar' }),
        route('/settings', SettingsComponent),
        route('/settings', HomeComponent, { outlet: 'sidebar' }),
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
    expect(router.state.path).toBe('/app/settings');
  });

  it('redirects direct address-bar entry when a frame disallows direct entry', async () => {
    const landingFrame = frame('landing', view(HomeComponent), {
      directEntry: true,
      transitions: ['private'],
    });
    const privateFrame = frame('private', view(ChildComponent), {
      transitions: [],
      directEntryRedirectTo: {
        frame: 'landing',
        params: {
          projectId: 7,
        },
      },
    });
    const routes = [
      route('/landing/:projectId', landingFrame, {
        paramsSchema: {
          projectId: s.number({ min: 1 }),
        },
      }),
      route('/private', privateFrame),
    ] as const satisfies NavigationTree;

    window.history.replaceState(null, '', '/private');

    bootstrap(routes);
    await settleInitialNavigation();

    expect(router.state.path).toBe('/landing/7');
    expect(getOutletContent()).toContain('<h1>Home</h1>');
  });

  it('allows direct entry through redirect routes that canonicalize into a frame', async () => {
    const landingFrame = frame('landing', view(HomeComponent), {
      directEntry: true,
      transitions: ['workspace'],
    });
    const workspaceFrame = frame('workspace', view(ChildComponent), {
      transitions: [],
    });
    const routes = [
      route('/landing', landingFrame),
      redirectRoute('/legacy', '/workspace'),
      route('/workspace', workspaceFrame),
    ] as const;

    window.history.replaceState(null, '', '/legacy');

    bootstrap(routes);
    await settleInitialNavigation();

    expect(router.state.path).toBe('/workspace');
    expect(window.location.pathname).toBe('/workspace');
    expect(getOutletContent()).toContain('<h3>Child</h3>');
  });

  it('allows declared frame-to-frame transitions after initial entry', async () => {
    const publicFrame = frame('public', view(HomeComponent), {
      directEntry: true,
      transitions: ['private'],
    });
    const privateFrame = frame('private', view(ChildComponent), {
      transitions: ['public'],
    });
    const routes = [
      route('/public', publicFrame),
      route('/private', privateFrame),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/public');
    await navigate('/private');

    expect(router.state.path).toBe('/private');
    expect(getOutletContent()).toContain('<h3>Child</h3>');
  });

  it('supports named redirect targets in frame guards', async () => {
    const settingsFrame = frame('settings', view(SettingsComponent));
    const adminFrame = frame(
      'admin',
      view(ChildComponent, {
        beforeEnter: [
          () => ({
            redirectTo: {
              frame: 'settings',
              query: {
                section: 'access',
              },
            },
            replace: true,
          }),
        ],
      }),
    );
    const routes = [
      route('/settings', settingsFrame, {
        querySchema: {
          section: s.string('general'),
        },
      }),
      route('/admin', adminFrame),
    ] as const satisfies NavigationTree;

    bootstrap(routes);
    await navigate('/admin');

    expect(router.state.path).toBe('/settings');
    expect(router.state.query['section']).toBe('access');
    expect(getOutletContent()).toContain('<h3>Settings</h3>');
  });

  it('accepts frame targets and carries payload through navigation state', async () => {
    const settingsFrame = frame('settings', view(SettingsComponent), {
      directEntry: true,
    });
    const routes = [route('/settings', settingsFrame)] as const;

    bootstrap(routes);

    await router.navigate({
      frame: 'settings',
      payload: {
        source: 'menu',
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.state.path).toBe('/settings');
    expect(router.state.historyState).toEqual({
      source: 'menu',
    });
    expect(router.displayUrl).toBe('/settings');
  });

  it('restores an internal-only frame from browser history state', async () => {
    const childFrame = frame('child', view(ChildComponent), {
      directEntry: true,
    });
    const routes = navigation({
      frames: [childFrame] as const,
      entries: [layout('/app', ShellComponent, [childFrame])] as const,
    });

    window.history.replaceState(
      {
        __aether_switchboard__: {
          userState: {
            source: 'restore',
          },
          matchHref: '/.switchboard/frames/child',
        },
      },
      '',
      '/',
    );

    bootstrap(routes);
    await settleInitialNavigation();

    expect(getOutletContent()).toContain('<h3>Child</h3>');
    expect(router.state.historyState).toEqual({
      source: 'restore',
    });
    expect(router.displayUrl).toBe('/');
    expect(window.location.pathname).toBe('/');
  });
});