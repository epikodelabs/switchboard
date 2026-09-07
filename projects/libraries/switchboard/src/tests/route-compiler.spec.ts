import {
  frame,
  layout,
  route,
  s,
} from '@epikodelabs/switchboard';

import { createRouteRegistry } from '../lib/route-compiler';

class TestPage {}
class TestLayout {}

describe('route compiler parameter validation', () => {
  it('rejects duplicate parameter names across layouts and leaf routes', () => {
    const routes = [
      layout('/teams/:id', TestLayout, [
        route('/members/:id', TestPage),
      ]),
    ] as const;

    expect(() => createRouteRegistry(routes)).toThrowError(
      /Duplicate path parameter ":id" in compiled route "\/teams\/:id\/members\/:id"/,
    );
  });

  it('rejects params keys that are absent from the compiled path', () => {
    const routes = [
      route('/users/:userId', TestPage, {
        params: {
          id: s.number(),
        },
      }),
    ] as const;

    expect(() => createRouteRegistry(routes)).toThrowError(
      /params declares "id".*does not contain ":id"/,
    );
  });

  it('requires every path parameter to be declared when params is present', () => {
    const routes = [
      route('/teams/:teamId/users/:userId', TestPage, {
        params: {
          teamId: s.number(),
        },
      }),
    ] as const;

    expect(() => createRouteRegistry(routes)).toThrowError(
      /contains ":userId", but params does not declare it/,
    );
  });

  it('accepts an exact params schema for the compiled path', () => {
    const routes = [
      layout('/teams/:teamId', TestLayout, [
        route('/users/:userId', TestPage, {
          params: {
            teamId: s.number(),
            userId: s.number(),
          },
        }),
      ]),
    ] as const;

    expect(() => createRouteRegistry(routes)).not.toThrow();
  });

  it('uses the frame id as the placed route name', () => {
    const frameId = frame('books', TestPage, {});
    const routes = [
      route('/books', frameId),
    ] as const;

    const registry = createRouteRegistry(routes);
    expect(registry.namedRoutes.has('books')).toBeTrue();
    expect(registry.frames.byId.get('books')?.matchPath).toBe('/books');
  });

  it('synthesizes outlet routes for a frame that owns outlets', () => {
    class Sidebar {}
    const withSidebar = frame('books', TestPage, {
      outlets: { sidebar: Sidebar },
    });
    const routes = [
      route('/books', withSidebar),
    ] as const;

    const registry = createRouteRegistry(routes);
    const group = registry.groups.find(g => g.primary.path === '/books');

    expect(group?.outlets.length).toBe(1);
    expect(group?.outlets[0]?.route.outlet).toBe('sidebar');
  });

  it('rejects transition targets that are not placed', () => {
    const isolated = frame('books', TestPage, {
      transitions: ['account'],
    });
    const routes = [
      route('/books', isolated),
    ] as const;

    expect(() => createRouteRegistry(routes)).toThrowError(
      /references unknown transition target "account"/,
    );
  });
});
