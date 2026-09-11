import {
  createServerFrameResolver,
  framesFor,
  frame,
} from '@epikodelabs/switchboard';
import { Component } from '@angular/core';

@Component({ template: '' })
class AdminPage {}

describe('server frame delivery', () => {
  it('loads dependency-first frame contributions and binds compiler artifact identity', async () => {
    const application = framesFor('application', [
      frame('workspace', '/workspace', AdminPage),
    ] as const);
    const administration = framesFor('administration', [
      frame('admin', '/admin', AdminPage),
    ] as const);

    const modules = new Map<string, unknown>([
      ['/application.js', { default: application }],
      ['/administration.js', { default: administration }],
    ]);

    const resolver = createServerFrameResolver({
      importModule: async url => modules.get(url),
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            artifactKey: 'admin-artifact',
            artifacts: [
              {
                artifactKey: 'app-artifact',
                moduleUrl: '/application.js',
                hash: 'a1',
                slotId: 'application',
              },
              {
                artifactKey: 'admin-artifact',
                moduleUrl: '/administration.js',
                hash: 'b1',
                slotId: 'administration',
              },
            ],
          };
        },
      }),
    });

    const result = await resolver(new URL('https://example.test/admin'));

    expect(result?.contributions.map(value => value.id)).toEqual([
      'app-artifact',
      'admin-artifact',
    ]);
    expect(result?.contributionIdentities['administration']).toContain('admin-artifact:b1');
  });

  it('treats 404 as hidden or unknown without disclosure', async () => {
    const resolver = createServerFrameResolver({
      importModule: async () => ({}),
      fetch: async () => ({
        ok: false,
        status: 404,
        async json() { return {}; },
      }),
    });

    expect(await resolver(new URL('https://example.test/hidden'))).toBeNull();
  });

  it('rejects an artifact that exports the wrong slot', async () => {
    const contribution = framesFor('other', [] as const);
    const resolver = createServerFrameResolver({
      importModule: async () => ({ default: contribution }),
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            artifactKey: 'admin-artifact',
            artifacts: [{
              artifactKey: 'admin-artifact',
              moduleUrl: '/admin.js',
              hash: 'x1',
              slotId: 'administration',
            }],
          };
        },
      }),
    });

    await expectAsync(
      resolver(new URL('https://example.test/admin')),
    ).toBeRejectedWithError(/expected "administration"/);
  });

  it('evicts a failed artifact import so a later resolution can recover', async () => {
    const contribution = framesFor('administration', [] as const);
    let imports = 0;
    const resolver = createServerFrameResolver({
      artifactRefreshRetries: 0,
      importModule: async () => {
        imports++;
        if (imports === 1) throw new Error('stale module');
        return { default: contribution };
      },
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            artifactKey: 'admin-artifact',
            artifacts: [{
              artifactKey: 'admin-artifact',
              moduleUrl: '/admin.js',
              hash: 'x1',
              slotId: 'administration',
            }],
          };
        },
      }),
    });

    await expectAsync(resolver(new URL('https://example.test/admin')))
      .toBeRejectedWithError('stale module');
    expect((await resolver(new URL('https://example.test/admin')))?.contributions).toHaveSize(1);
    expect(imports).toBe(2);
  });

  it('re-resolves once after a stale artifact import by default', async () => {
    const contribution = framesFor('administration', [] as const);
    let imports = 0;
    const resolver = createServerFrameResolver({
      importModule: async () => {
        imports++;
        if (imports === 1) throw new Error('stale module');
        return { default: contribution };
      },
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            artifactKey: 'admin-artifact',
            artifacts: [{
              artifactKey: 'admin-artifact',
              moduleUrl: '/admin.js',
              hash: `x${imports + 1}`,
              slotId: 'administration',
            }],
          };
        },
      }),
    });

    expect((await resolver(new URL('https://example.test/admin')))?.contributions).toHaveSize(1);
    expect(imports).toBe(2);
  });

  it('does not retry a malformed artifact export', async () => {
    let resolutions = 0;
    const resolver = createServerFrameResolver({
      fetch: async () => {
        resolutions++;
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              artifactKey: 'admin-artifact',
              artifacts: [{
                artifactKey: 'admin-artifact',
                moduleUrl: '/admin.js',
                hash: 'x1',
                slotId: 'administration',
              }],
            };
          },
        };
      },
      importModule: async () => ({ default: [] }),
    });

    await expectAsync(resolver(new URL('https://example.test/admin')))
      .toBeRejectedWithError(/did not export a frame contribution/);
    expect(resolutions).toBe(1);
  });

  it('honors cancellation after resolution and before importing artifacts', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let imports = 0;
    const controller = new AbortController();
    const resolver = createServerFrameResolver({
      fetch: async () => {
        await gate;
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              artifactKey: 'admin-artifact',
              artifacts: [{
                artifactKey: 'admin-artifact',
                moduleUrl: '/admin.js',
                hash: 'x1',
                slotId: 'administration',
              }],
            };
          },
        };
      },
      importModule: async () => {
        imports++;
        return { default: framesFor('administration', [] as const) };
      },
    });

    const pending = resolver(new URL('https://example.test/admin'), {
      signal: controller.signal,
    });
    controller.abort();
    release();

    await expectAsync(pending).toBeRejected();
    expect(imports).toBe(0);
  });

  it('supports resolution endpoints that already include a query string', async () => {
    let request = '';
    const resolver = createServerFrameResolver({
      endpoint: '/internal/resolve?',
      fetch: async input => {
        request = input;
        return { ok: false, status: 404, async json() { return {}; } };
      },
      importModule: async () => ({ default: framesFor('unused', [] as const) }),
    });

    await resolver(new URL('https://example.test/admin'));
    expect(request).toBe('/internal/resolve?path=%2Fadmin');
  });
});
