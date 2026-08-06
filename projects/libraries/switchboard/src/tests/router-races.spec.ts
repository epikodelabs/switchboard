import {
  createRouter,
  type Route,
  type VanillaRouter,
} from '@epikodelabs/switchboard';
import { idescribe } from './env.spec';

idescribe('Router configuration races', () => {
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

  it('aborts the destroy signal of an in-flight component render', async () => {
    let resolveRender!: (node: Node) => void;
    let started!: () => void;
    const renderStarted = new Promise<void>(resolve => started = resolve);
    const render = new Promise<Node>(resolve => resolveRender = resolve);
    const destroyed = jasmine.createSpy('destroyed');

    const slow: Route = {
      path: 'slow',
      load: async () => ({
        component: (_route, context) => {
          context.destroySignal.addEventListener('abort', destroyed, { once: true });
          started();
          return render;
        },
      }),
    };
    const next: Route = {
      path: 'next',
      load: async () => ({ component: () => document.createTextNode('Next') }),
    };

    router = createRouter({ routes: [slow], outlet });
    const navigation = router.navigate('/slow');
    await renderStarted;

    expect(router.replaceRoutes([next])).toBeTrue();
    expect(destroyed).toHaveBeenCalledTimes(1);

    resolveRender(document.createTextNode('Slow'));
    await expectAsync(navigation).toBeResolvedTo(false);
    expect(outlet.textContent).toBe('');
  });
});
