import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  frame,
  frameSlot,
  framesFor,
  provideServerRouter,
  Router,
  type ServerFrameResolver,
} from '@epikodelabs/switchboard';

ensureAngularTestEnvironment();

@Component({ standalone: true, template: '<h1>Protected</h1>' })
class ProtectedComponent {}

describe('Switchboard server frame integration', () => {
  let router: Router;
  let outlet: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState(null, '', '/protected');
  });

  afterEach(() => {
    router?.dispose();
    outlet?.remove();
  });

  it('resolves protected frames before initial navigation starts', async () => {
    const contribution = framesFor('application', [
      frame('protected', ProtectedComponent, {
        address: '/protected',
        directEntry: true,
      }),
    ]);
    const resolveFrames: ServerFrameResolver = async url =>
      url.pathname === '/protected'
        ? {
            contributions: [contribution],
            contributionIdentities: {
              application: 'application:HASH:/api/navigation/modules/application/HASH',
            },
          }
        : null;

    TestBed.configureTestingModule({
      imports: [ProtectedComponent],
      providers: [
        ...provideServerRouter(
          [frameSlot('application')],
          { resolveFrames },
        ),
      ],
    });

    outlet = document.createElement('div');
    router = TestBed.inject(Router);
    router.connect('', outlet);

    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(router.state.path).toBe('/protected');
    expect(outlet.innerHTML).toContain('<h1>Protected</h1>');
  });

  it('resolves a missing path before programmatic navigation', async () => {
    const contribution = framesFor('application', [
      frame('protected', ProtectedComponent, {
        address: '/protected',
        directEntry: true,
      }),
    ]);
    let calls = 0;
    const resolveFrames: ServerFrameResolver = async url => {
      calls++;
      return url.pathname === '/protected'
        ? {
            contributions: [contribution],
            contributionIdentities: { application: 'application:HASH' },
          }
        : null;
    };

    window.history.replaceState(null, '', '/');
    TestBed.configureTestingModule({
      imports: [ProtectedComponent],
      providers: [
        ...provideServerRouter(
          [frameSlot('application')],
          { resolveFrames },
        ),
      ],
    });

    outlet = document.createElement('div');
    router = TestBed.inject(Router);
    router.connect('', outlet);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(await router.navigate({ path: '/protected' })).toBeTrue();
    expect(calls).toBeGreaterThan(0);
    expect(router.state.path).toBe('/protected');
    expect(outlet.innerHTML).toContain('<h1>Protected</h1>');
  });
});
