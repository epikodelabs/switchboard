import {
  createRouter,
  type NavigationTransitionDefinition,
  type Route,
  type VanillaRouter,
} from '@epikodelabs/switchboard';

import { idescribe } from './env.spec';

function route(path: string, text: string): Route {
  return {
    path,
    load: async () => ({
      component: () => document.createTextNode(text),
    }),
  };
}

idescribe('Router dynamic configuration', () => {
  let outlet: HTMLElement;
  let router: VanillaRouter;

  beforeEach(() => {
    outlet = document.createElement('div');
    document.body.appendChild(outlet);
    window.history.replaceState(null, '', '/');
    spyOn(console, 'debug');
    spyOn(console, 'error');
  });

  afterEach(() => {
    router?.dispose();
    window.history.replaceState(null, '', '/');
    outlet.remove();
  });

  it('replaces routes and transitions atomically', async () => {
    const oldRoute = route('', 'Old');
    const nextRoute = route('', 'Next');
    const calls: string[] = [];
    const oldTransition: NavigationTransitionDefinition = {
      beforeEnter: [() => { calls.push('old'); return true; }],
    };
    const nextTransition: NavigationTransitionDefinition = {
      beforeEnter: [() => { calls.push('next'); return true; }],
    };

    router = createRouter({
      routes: [oldRoute],
      transitions: [oldTransition],
      outlet,
    });

    expect(await router.navigate('/')).toBeTrue();
    expect(outlet.textContent).toBe('Old');

    expect(router.replaceConfiguration({
      routes: [nextRoute],
      transitions: [nextTransition],
    })).toBeTrue();

    expect(outlet.textContent).toBe('Old');
    expect(router.routeVersion).toBe(1);

    expect(await router.revalidate()).toBeTrue();
    expect(outlet.textContent).toBe('Next');
    expect(calls).toEqual(['old', 'next']);
  });

  it('keeps routeVersion stable for transition-only updates', () => {
    const home = route('', 'Home');
    router = createRouter({ routes: [home], outlet });

    expect(router.replaceTransitions([{}])).toBeTrue();
    expect(router.routeVersion).toBe(0);
    expect(router.replaceTransitions([{}])).toBeTrue();
  });

  it('supports add and remove without implicit revalidation', async () => {
    const home = route('', 'Home');
    const extra = route('extra', 'Extra');
    router = createRouter({ routes: [home], outlet });

    expect(router.addRoutes([extra])).toBeTrue();
    expect(await router.navigate('/extra')).toBeTrue();
    expect(outlet.textContent).toBe('Extra');

    expect(router.removeRoutes(candidate => candidate === extra)).toBeTrue();
    expect(outlet.textContent).toBe('Extra');
    expect(await router.revalidate()).toBeFalse();
  });

  it('returns immutable route snapshots', () => {
    const home = route('', 'Home');
    router = createRouter({ routes: [home], outlet });
    const snapshot = router.routes() as Route[];

    expect(Object.isFrozen(snapshot)).toBeTrue();
    expect(() => snapshot.push(route('x', 'X'))).toThrow();
    expect(router.routes()).toEqual([home]);
  });

  it('does not cancel pending navigation when replacement validation fails', async () => {
    let resolve!: (value: { component: () => Node }) => void;
    const pending = new Promise<{ component: () => Node }>(accept => resolve = accept);
    const slow: Route = { path: 'slow', load: () => pending };
    router = createRouter({ routes: [slow], outlet });

    const navigation = router.navigate('/slow');
    await Promise.resolve();

    expect(() => router.replaceConfiguration({
      routes: [route('same', 'One'), route('same', 'Two')],
      transitions: [],
    })).toThrow();
    expect(router.state.pending).toBeTrue();

    resolve({ component: () => document.createTextNode('Slow') });
    await expectAsync(navigation).toBeResolvedTo(true);
  });
});
