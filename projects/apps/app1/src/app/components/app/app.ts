import {
  Component,
  DoCheck,
  inject,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterOutlet,
} from '@epikodelabs/switchboard';

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
  private readonly headerPulseToken = signal<number | null>(null);
  private lastHeaderState: string | null = null;

  ngDoCheck(): void {
    const nextHeaderState = [
      this.activeFrame(),
      this.phaseLabel(),
      this.publicAddress(),
    ].join('|');

    if (this.lastHeaderState !== null && this.lastHeaderState !== nextHeaderState) {
      this.headerPulseToken.update(value => (value ?? 0) + 1);
    }

    this.lastHeaderState = nextHeaderState;
  }

  protected isTransitioning(): boolean {
    return this.router.state.pending;
  }

  protected phaseLabel(): string {
    return this.router.state.phase ?? 'idle';
  }

  protected activeFrame(): string {
    return String(
      this.router.state.current?.config.name
      ?? this.router.state.routeConfig?.name
      ?? 'dock',
    );
  }

  protected publicAddress(): string {
    return `${window.location.pathname}${window.location.search}`;
  }

  protected hasHeaderPulse(): boolean {
    return this.headerPulseToken() !== null;
  }

  protected currentHeaderPulseToken(): number {
    return this.headerPulseToken() ?? 0;
  }
}
