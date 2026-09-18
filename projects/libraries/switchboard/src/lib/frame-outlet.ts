import { DestroyRef, Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

import { FrameRuntime } from './frame-runtime';
import { CURRENT_FRAME_NODE } from './frame-tree';

@Directive({ selector: 'frame-outlet', standalone: true })
export class FrameOutlet implements OnInit {
  private readonly runtime = inject(FrameRuntime);
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly owner = inject(CURRENT_FRAME_NODE, { optional: true });
  private connectedName = '';

  @Input() name = '';

  ngOnInit(): void {
    this.connectedName = this.resolveName();

    if (!this.shouldConnect(this.connectedName)) {
      return;
    }

    this.runtime.connect(this.connectedName, this.element, this.owner);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (!this.shouldConnect(this.connectedName)) {
        return;
      }

      this.runtime.disconnect(this.connectedName, this.element);
    });
  }

  private resolveName(): string {
    return (this.name || this.element.getAttribute('name') || '').trim();
  }

  private shouldConnect(name: string): boolean {
    return name !== '' || this.owner === null;
  }
}
