import {
  frame,
  redirect,
  s,
} from '@epikodelabs/switchboard';

import { createRouteRegistry } from '../lib/frame-compiler';

class TestPage {}
class TestLayout {}

describe('frame compiler parameter validation', () => {
  it('rejects duplicate parameter names across parent and nested frames', () => {
    const routes = [
      frame('team', '/teams/:id', TestLayout, {
        layout: [
          frame('member', '/members/:id', TestPage),
        ],
      }),
    ] as const;

    expect(() => createRouteRegistry(routes)).toThrowError(
      /Duplicate path parameter ":id" in compiled route "\/teams\/:id\/members\/:id"/,
    );
  });

  it('rejects params keys that are absent from the compiled path', () => {
    const routes = [
      frame('user', '/users/:userId', TestPage, {
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
      frame('user', '/teams/:teamId/users/:userId', TestPage, {
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
      frame('team', '/teams/:teamId', TestLayout, {
        layout: [
          frame('user', '/users/:userId', TestPage, {
            params: {
              teamId: s.number(),
              userId: s.number(),
            },
          }),
        ],
      }),
    ] as const;

    expect(() => createRouteRegistry(routes)).not.toThrow();
  });

  it('uses direct frame entries as named navigation records', () => {
    const booksFrame = frame('books', '/books', TestPage, {});
    const routes = [
      booksFrame,
    ] as const;

    const registry = createRouteRegistry(routes);
    expect(registry.namedRoutes.has('books')).toBeTrue();
    expect(registry.frames.byId.get('books')?.matchPath).toBe('/books');
  });

  it('resolves redirect frame targets through the compiled frame graph', () => {
    const booksFrame = frame('books', '/books', TestPage, {});
    const routes = [
      frame('ledger', '/ledger', TestLayout, {
        layout: [
          redirect('', booksFrame),
          booksFrame,
        ],
      }),
    ] as const;

    const registry = createRouteRegistry(routes);
    const group = registry.groups.find(g => g.primary.path === '/ledger');

    expect(group?.primary.redirectTo).toBe('/ledger/books');
  });

  it('compiles nested frames through their parent frame', () => {
    const child = frame('child', '/child', TestPage);
    const routes = [
      frame('parent', '/parent', TestLayout, {
        layout: [child],
      }),
    ] as const;

    const registry = createRouteRegistry(routes);

    expect(registry.namedRoutes.has('parent')).toBeFalse();
    expect(registry.namedRoutes.get('child')?.fullPath).toBe('/parent/child');
    expect(registry.groups.find(g => g.primary.path === '/parent/child')?.primary.layouts.length).toBe(1);
  });

  it('synthesizes outlet routes for a frame that owns outlets', () => {
    class Sidebar {}
    const withSidebar = frame('books', '/books', TestPage, {
      outlets: { sidebar: Sidebar },
    });
    const routes = [
      withSidebar,
    ] as const;

    const registry = createRouteRegistry(routes);
    const group = registry.groups.find(g => g.primary.path === '/books');

    expect(group?.outlets.length).toBe(1);
    expect(group?.outlets[0]?.route.outlet).toBe('sidebar');
  });

  it('rejects transition targets that are not placed', () => {
    const isolated = frame('books', '/books', TestPage, {
      transitions: ['account'],
    });
    const routes = [
      isolated,
    ] as const;

    expect(() => createRouteRegistry(routes)).toThrowError(
      /references unknown transition target "account"/,
    );
  });

  it('does not encode authored frame ancestry into the route registry', () => {
    const routes = [
      frame('app', '/app', TestLayout, {
        layout: [
          frame('workspace', '/workspace', TestLayout, {
            layout: [frame('document', '/document', TestPage)],
          }),
        ],
      }),
    ] as const;

    const registry = createRouteRegistry(routes);
    expect(Object.keys(registry.frames.byId.get('document') ?? {}))
      .not.toContain('parentFrameIds');
  });

});
