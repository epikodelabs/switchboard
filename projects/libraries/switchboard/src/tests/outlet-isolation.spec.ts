import { ensureAngularTestEnvironment } from './angular-testbed.init';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FrameOutlet } from '@epikodelabs/switchboard';

ensureAngularTestEnvironment();

@Component({
  standalone: true,
  imports: [FrameOutlet],
  template: '<frame-outlet />',
})
class FrameOutletHost {}

describe('FrameOutlet isolation', () => {
  it('should compile the Angular-compatible frame-outlet selector', async () => {
    expect(FrameOutlet).toBeTruthy();
    expect((FrameOutlet as any)['\u0275dir']).toBeTruthy();

    await TestBed.configureTestingModule({
      imports: [FrameOutletHost],
    }).compileComponents();

    expect().nothing();
  });
});
