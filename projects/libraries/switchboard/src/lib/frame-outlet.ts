import { DestroyRef, Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

import { FrameRuntime } from './frame-runtime';
import { CURRENT_VIEW_NODE } from './frame-tree';

@Directive({ selector: 'frame-outlet', standalone: true })
export class FrameOutlet implements OnInit {
  private readonly runtime = inject(FrameRuntime);
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly owner = inject(CURRENT_VIEW_NODE, { optional: true });
  private connected = false;

  @Input() name = '';

  ngOnInit(): void {
    const name = this.resolveName();
    this.runtime.connect(name, this.element, this.owner);
    this.connected = true;
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.connected) this.runtime.disconnect(this.resolveName(), this.element);
    });
  }

  private resolveName(): string {
    return (this.name || this.element.getAttribute('name') || '').trim();
  }
}
