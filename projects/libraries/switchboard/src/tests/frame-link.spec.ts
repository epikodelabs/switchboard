import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FrameLink,
  FrameOutlet,
  FrameNavigator,
  provideFrameGraph,
  frame,
} from '@epikodelabs/switchboard';

ensureAngularTestEnvironment();

function delay(ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dispatchAnchorClick(target: HTMLAnchorElement): boolean {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
  });

  let defaultPrevented = false;
  const cleanupListener = (currentEvent: MouseEvent) => {
    defaultPrevented = currentEvent.defaultPrevented;
    currentEvent.preventDefault();
  };

  document.addEventListener('click', cleanupListener);
  try {
    target.dispatchEvent(event);
  } finally {
    document.removeEventListener('click', cleanupListener);
  }

  return defaultPrevented;
}

@Component({
  selector: 'sb-test-home',
  standalone: true,
  template: '<h1>Home</h1>',
})
class HomeComponent {}

@Component({
  selector: 'sb-test-about',
  standalone: true,
  template: '<h1>About</h1>',
})
class AboutComponent {}

@Component({
  standalone: true,
  imports: [FrameLink, FrameOutlet],
  template: '<a [frameLink]="target">About</a><frame-outlet />',
})
class FrameLinkHostComponent {
  target = '/about';
}

describe('FrameLink', () => {
  let navigator: FrameNavigator;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    navigator?.dispose();
  });

  it('binds href for FrameLink and navigates through anchor clicks', async () => {
    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        AboutComponent,
        FrameLinkHostComponent,
      ],
      providers: [
        ...provideFrameGraph([
          frame('home', '/', HomeComponent),
          frame('about', '/about', AboutComponent),
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FrameLinkHostComponent);
    navigator = TestBed.inject(FrameNavigator);

    fixture.detectChanges();
    await delay();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const anchor = host.querySelector('a');

    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/about');

    const defaultPrevented = dispatchAnchorClick(anchor as HTMLAnchorElement);

    await delay();
    fixture.detectChanges();

    expect(defaultPrevented).toBeTrue();
    expect(navigator.state.current?.path).toBe('/about');
    expect(host.textContent).toContain('About');
  });
});


