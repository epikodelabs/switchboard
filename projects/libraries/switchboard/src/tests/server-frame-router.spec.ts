import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  frame,
  frameSlot,
  framesFor,
  provideServerFrameGraph,
  FrameNavigator,
  type ServerFrameResolver,
} from '@epikodelabs/switchboard';

ensureAngularTestEnvironment();

@Component({ standalone: true, template: '<h1>Protected</h1>' })
class ProtectedComponent {}

describe('Switchboard server frame integration', () => {
  let navigator: FrameNavigator;
  let outlet: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState(null, '', '/protected');
  });

  afterEach(() => {
    navigator?.dispose();
    outlet?.remove();
  });

  it('resolves protected frames before initial navigation starts', async () => {
    const contribution = framesFor('application', [
      frame('protected', '/protected', ProtectedComponent, {
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
        ...provideServerFrameGraph(
          [frameSlot('application')],
          { resolveFrames },
        ),
      ],
    });

    outlet = document.createElement('div');
    navigator = TestBed.inject(FrameNavigator);
    navigator.connect('', outlet);

    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(navigator.state.path).toBe('/protected');
    expect(outlet.innerHTML).toContain('<h1>Protected</h1>');
  });

  it('resolves a missing path before programmatic navigation', async () => {
    const contribution = framesFor('application', [
      frame('protected', '/protected', ProtectedComponent, {
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
        ...provideServerFrameGraph(
          [frameSlot('application')],
          { resolveFrames },
        ),
      ],
    });

    outlet = document.createElement('div');
    navigator = TestBed.inject(FrameNavigator);
    navigator.connect('', outlet);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(await navigator.navigate({ path: '/protected' })).toBeTrue();
    expect(calls).toBeGreaterThan(0);
    expect(navigator.state.path).toBe('/protected');
    expect(outlet.innerHTML).toContain('<h1>Protected</h1>');
  });

  it('allows a failed server-frame resolution to be retried after revalidate', async () => {
    const contribution = framesFor('application', [
      frame('protected', '/protected', ProtectedComponent, {
        directEntry: true,
      }),
    ]);
    let available = false;
    let calls = 0;
    const resolveFrames: ServerFrameResolver = async url => {
      calls++;
      if (url.pathname !== '/protected' || !available) {
        return null;
      }
      return {
        contributions: [contribution],
        contributionIdentities: { application: 'application:HASH' },
      };
    };

    window.history.replaceState(null, '', '/');
    TestBed.configureTestingModule({
      imports: [ProtectedComponent],
      providers: [
        ...provideServerFrameGraph(
          [frameSlot('application')],
          { resolveFrames },
        ),
      ],
    });

    outlet = document.createElement('div');
    navigator = TestBed.inject(FrameNavigator);
    navigator.connect('', outlet);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(await navigator.navigate({ path: '/protected' })).toBeFalse();
    const callsAfterFailure = calls;

    expect(await navigator.navigate({ path: '/protected' })).toBeFalse();
    expect(calls).toBe(callsAfterFailure);

    available = true;
    await navigator.revalidate();

    expect(await navigator.navigate({ path: '/protected' })).toBeTrue();
    expect(calls).toBeGreaterThan(callsAfterFailure);
    expect(navigator.state.path).toBe('/protected');
  });

});