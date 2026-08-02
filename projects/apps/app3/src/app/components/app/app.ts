import {
  Component,
  DestroyRef,
  DoCheck,
  inject,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterOutlet,
} from '@epikodelabs/switchboard';

import { OperationsRoomService } from '../../services/operations-room.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements DoCheck {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly room = inject(OperationsRoomService);
  private readonly sweepToken = signal(0);
  private readonly sweepActive = signal(false);
  private lastPending = false;
  private resetTimeout: ReturnType<typeof setTimeout> | null = null;
  private sweepTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.resetTimeout !== null) {
        clearTimeout(this.resetTimeout);
      }

      if (this.sweepTimeout !== null) {
        clearTimeout(this.sweepTimeout);
      }
    });
  }

  ngDoCheck(): void {
    const pending = this.router.state.pending;

    if (pending && !this.lastPending) {
      this.triggerSweep();
    }

    this.lastPending = pending;
  }

  protected isTransitioning(): boolean {
    return this.router.state.pending;
  }

  protected hasSweep(): boolean {
    return this.sweepActive();
  }

  protected currentSweepToken(): number {
    return this.sweepToken();
  }

  protected phaseLabel(): string {
    return this.router.state.phase ?? 'idle';
  }

  protected activeFrame(): string {
    return String(this.router.state.routeConfig?.name ?? 'dock');
  }

  protected publicAddress(): string {
    return `${window.location.pathname}${window.location.search}`;
  }

  private triggerSweep(): void {
    this.sweepActive.set(false);

    if (this.resetTimeout !== null) {
      clearTimeout(this.resetTimeout);
    }

    if (this.sweepTimeout !== null) {
      clearTimeout(this.sweepTimeout);
    }

    this.resetTimeout = setTimeout(() => {
      this.sweepToken.update(value => value + 1);
      this.sweepActive.set(true);
      this.resetTimeout = null;
    }, 16);

    this.sweepTimeout = setTimeout(() => {
      this.sweepActive.set(false);
      this.sweepTimeout = null;
    }, 1040);
  }
}
