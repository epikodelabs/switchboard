import { Component, DestroyRef, DoCheck, inject, signal } from '@angular/core';
import {
  ROUTER_LOCATION_CHANGE_EVENT,
  Router,
  RouterLink,
  RouterOutlet,
} from '@epikodelabs/switchboard';

interface HeaderSnapshot {
  readonly frame: string;
  readonly phase: string;
  readonly address: string;
  readonly transitioning: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements DoCheck {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly headerPulseToken = signal<number | null>(null);
  protected readonly headerState = signal<HeaderSnapshot>(this.readHeaderState());

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const sync = () => this.syncHeaderState();

    window.addEventListener(ROUTER_LOCATION_CHANGE_EVENT, sync);
    window.addEventListener('popstate', sync);
    window.addEventListener('routechange', sync as EventListener);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener(ROUTER_LOCATION_CHANGE_EVENT, sync);
      window.removeEventListener('popstate', sync);
      window.removeEventListener('routechange', sync as EventListener);
    });
  }

  ngDoCheck(): void {
    this.syncHeaderState();
  }

  protected isTransitioning(): boolean {
    return this.headerState().transitioning;
  }

  protected activeFrame(): string {
    return this.headerState().frame;
  }

  protected phaseLabel(): string {
    return this.headerState().phase;
  }

  protected publicAddress(): string {
    return this.headerState().address;
  }

  protected hasHeaderPulse(): boolean {
    return this.headerPulseToken() !== null;
  }

  protected currentHeaderPulseToken(): number {
    return this.headerPulseToken() ?? 0;
  }

  private syncHeaderState(): void {
    const previous = this.headerState();
    const next = this.readHeaderState();

    if (
      previous.frame === next.frame &&
      previous.phase === next.phase &&
      previous.address === next.address &&
      previous.transitioning === next.transitioning
    ) {
      return;
    }

    this.headerState.set(next);
    this.headerPulseToken.update((value) => (value ?? 0) + 1);
  }

  private readHeaderState(): HeaderSnapshot {
    const state = this.router.state;

    return {
      frame: String(state.current?.config.name ?? state.routeConfig?.name ?? 'dashboard'),
      phase: state.phase ?? 'idle',
      address: this.router.displayUrl || '/',
      transitioning: state.pending,
    };
  }
}
