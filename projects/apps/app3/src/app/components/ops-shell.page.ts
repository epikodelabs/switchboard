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

import { OperationsRoomService } from '../services/operations-room.service';

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
  ],
  template: `
    <section
      class="ops-shell"
      [class.ops-shell--transitioning]="isTransitioning()"
    >
      <aside class="ops-shell__rail">
        <div class="ops-shell__card">
          <p class="ops-shell__label">Operator</p>
          <strong>{{ currentOperator().name }}</strong>
          <span>
            {{ currentOperator().title }} | {{ currentOperator().callsign }}
          </span>
          <div class="ops-shell__toggle-row">
            @for (operator of room.operators; track operator.id) {
              <button
                type="button"
                class="ops-shell__toggle"
                [class.ops-shell__toggle--active]="operator.id === currentOperator().id"
                (click)="selectOperator(operator.id)"
              >
                {{ operator.callsign }}
              </button>
            }
          </div>
        </div>

        <nav class="ops-shell__mission-grid" aria-label="Mission selection">
          @for (mission of room.missions; track mission.id) {
            <a class="ops-shell__nav-card" [routerLink]="missionTarget(mission.id)">
              <strong>{{ mission.codeName }}</strong>
              <span>#{{ mission.id }} | {{ mission.sector }}</span>
            </a>
          }
        </nav>

        <div class="ops-shell__card">
          <p class="ops-shell__label">Frame note</p>
          <strong>{{ activeFrame() }}</strong>
          <p>
            Handoff is mounted as a bare frame entry. Its frame id changes, but the
            public address can stay on the previous mission or analysis route.
          </p>
        </div>

        <section class="ops-shell__outlet">
          <p class="ops-shell__label">Companion panel</p>
          <router-outlet name="sidebar" />
        </section>

        <div class="ops-shell__card">
          <p class="ops-shell__label">Recent events</p>
          <ul class="ops-shell__feed">
            @for (event of room.eventFeed(); track $index) {
              <li>{{ event }}</li>
            }
          </ul>
        </div>
      </aside>

      <main class="ops-shell__stage">
        @if (hasSweep()) {
          @for (token of [currentSweepToken()]; track token) {
            <div class="ops-shell__sweep" aria-hidden="true"></div>
          }
        }
        <div class="ops-shell__content">
          <router-outlet />
        </div>
      </main>
    </section>
  `,
  styles: `
    .ops-shell {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
      gap: 1rem;
      max-width: 92rem;
      margin: 0 auto;
    }

    .ops-shell__rail,
    .ops-shell__stage {
      min-width: 0;
      padding: 1rem;
      border: 1px solid var(--line-soft);
      border-radius: 1.7rem;
      background:
        linear-gradient(180deg, rgb(255 255 255 / 0.84), rgb(247 250 253 / 0.76)),
        var(--panel-base);
      box-shadow: var(--stage-shadow);
      backdrop-filter: blur(18px);
    }

    .ops-shell__rail {
      display: grid;
      align-content: start;
      gap: 0.9rem;
    }

    .ops-shell__stage {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      transition:
        box-shadow 220ms ease,
        filter 220ms ease;
    }

    .ops-shell__content {
      position: relative;
      z-index: 1;
    }

    .ops-shell__sweep {
      position: absolute;
      top: -12%;
      bottom: -12%;
      left: -44%;
      width: 44%;
      background:
        linear-gradient(
          96deg,
          rgb(0 143 180 / 0) 0%,
          rgb(0 143 180 / 0.2) 18%,
          rgb(255 255 255 / 0.94) 44%,
          rgb(255 255 255 / 0.99) 50%,
          rgb(216 137 31 / 0.52) 63%,
          rgb(216 137 31 / 0) 100%
        );
      opacity: 0;
      pointer-events: none;
      z-index: 2;
      transform: skewX(-18deg);
      box-shadow:
        0 0 28px rgb(255 255 255 / 0.34),
        0 0 42px rgb(0 143 180 / 0.18);
      animation: stage-sweep 980ms cubic-bezier(0.18, 1, 0.32, 1) 1 forwards;
    }

    .ops-shell--transitioning .ops-shell__stage {
      filter: saturate(1.04);
      box-shadow:
        var(--stage-shadow),
        0 0 0 1px rgb(0 143 180 / 0.08);
    }

    .ops-shell__card,
    .ops-shell__outlet {
      padding: 1rem;
      border: 1px solid var(--line-soft);
      border-radius: 1.15rem;
      background: rgb(255 255 255 / 0.72);
    }

    .ops-shell__label {
      margin: 0 0 0.7rem;
      color: var(--ink-soft);
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .ops-shell__card strong,
    .ops-shell__card span {
      display: block;
    }

    .ops-shell__card span,
    .ops-shell__card p {
      color: var(--ink-soft);
      line-height: 1.6;
    }

    .ops-shell__toggle-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-top: 0.9rem;
    }

    .ops-shell__toggle {
      min-height: 2.55rem;
      padding: 0.62rem 0.82rem;
      border: 1px solid rgb(0 143 180 / 0.16);
      border-radius: 999px;
      background: rgb(255 255 255 / 0.86);
      color: var(--signal-deep);
      font-weight: 700;
      cursor: pointer;
    }

    .ops-shell__toggle--active {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
      color: #fff;
    }

    .ops-shell__mission-grid {
      display: grid;
      gap: 0.75rem;
    }

    .ops-shell__nav-card {
      display: block;
      padding: 0.95rem;
      border: 1px solid var(--line-soft);
      border-radius: 1.1rem;
      background: rgb(255 255 255 / 0.74);
      text-decoration: none;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .ops-shell__nav-card strong,
    .ops-shell__nav-card span {
      display: block;
    }

    .ops-shell__nav-card span {
      margin-top: 0.35rem;
      color: var(--ink-soft);
      line-height: 1.5;
    }

    .ops-shell__nav-card:hover {
      transform: translateY(-1px);
      border-color: rgb(0 143 180 / 0.14);
      box-shadow: 0 12px 24px rgb(17 34 48 / 0.08);
    }

    .ops-shell__feed {
      display: grid;
      gap: 0.65rem;
      margin: 0;
      padding-left: 1rem;
    }

    .ops-shell__feed li {
      line-height: 1.55;
    }

    @keyframes stage-sweep {
      from {
        transform: translateX(0) skewX(-18deg);
        opacity: 0;
      }

      12% {
        opacity: 0.98;
      }

      24%,
      76% {
        opacity: 1;
      }

      to {
        transform: translateX(355%) skewX(-18deg);
        opacity: 0;
      }
    }

    @media (max-width: 980px) {
      .ops-shell {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class OpsShellPage implements DoCheck {
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

  protected currentOperator() {
    return this.room.currentOperator();
  }

  protected selectOperator(operatorId: string): void {
    this.room.selectOperator(operatorId);
  }

  protected missionTarget(missionId: number) {
    return {
      name: 'mission',
      params: {
        missionId,
      },
      query: {
        lane: 'thermal',
        zoom: 2,
      },
    } as const;
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

  protected activeFrame(): string {
    return String(this.router.state.routeConfig?.name ?? 'dock');
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
    }, 980);
  }
}
