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
      frame('workspace', AdminPage, { address: '/workspace' }),
    ] as const);
    const administration = framesFor('administration', [
      frame('admin', AdminPage, { address: '/admin' }),
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
});
