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
      @if (hasSweep()) {
        @for (token of [currentSweepToken()]; track token) {
          <div class="ops-shell__ambient" aria-hidden="true">
            <span class="ops-shell__ambient-ring"></span>
            <span class="ops-shell__ambient-ring ops-shell__ambient-ring--delayed"></span>
            <span class="ops-shell__ambient-grid"></span>
          </div>
        }
      }

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
            <div class="ops-shell__fx" aria-hidden="true">
              <div class="ops-shell__brackets">
                <span class="ops-shell__bracket ops-shell__bracket--tl"></span>
                <span class="ops-shell__bracket ops-shell__bracket--tr"></span>
                <span class="ops-shell__bracket ops-shell__bracket--bl"></span>
                <span class="ops-shell__bracket ops-shell__bracket--br"></span>
              </div>
              <div class="ops-shell__scanlines"></div>
              <div class="ops-shell__sweep"></div>
              <div class="ops-shell__sweep ops-shell__sweep--echo"></div>
              <div class="ops-shell__flash"></div>
            </div>
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
      grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr);
      gap: 0.75rem;
      max-width: 92rem;
      margin: 0 auto;
      overflow: hidden;
      min-height: calc(100vh - 7.2rem);
    }

    .ops-shell__ambient {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .ops-shell__ambient-ring {
      position: absolute;
      top: 5rem;
      right: 7rem;
      width: 18rem;
      height: 18rem;
      border: 1px solid rgb(0 143 180 / 0.16);
      border-radius: 999px;
      opacity: 0;
      animation: ambient-ring 1180ms ease-out 1 forwards;
    }

    .ops-shell__ambient-ring--delayed {
      width: 24rem;
      height: 24rem;
      top: 2rem;
      right: 4rem;
      animation-delay: 140ms;
    }

    .ops-shell__ambient-grid {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(rgb(0 143 180 / 0.05), rgb(0 143 180 / 0.05)),
        repeating-linear-gradient(
          90deg,
          rgb(255 255 255 / 0.12) 0,
          rgb(255 255 255 / 0.12) 1px,
          transparent 1px,
          transparent 2.2rem
        ),
        repeating-linear-gradient(
          180deg,
          rgb(255 255 255 / 0.1) 0,
          rgb(255 255 255 / 0.1) 1px,
          transparent 1px,
          transparent 2.2rem
        );
      opacity: 0;
      animation: ambient-grid 980ms ease-out 1 forwards;
    }

    .ops-shell__rail,
    .ops-shell__stage {
      min-width: 0;
      padding: 0.75rem;
      border: 1px solid var(--line-soft);
      border-radius: 1.25rem;
      background:
        linear-gradient(180deg, rgb(255 255 255 / 0.84), rgb(247 250 253 / 0.76)),
        var(--panel-base);
      box-shadow: var(--stage-shadow);
      backdrop-filter: blur(18px);
    }

    .ops-shell__rail {
      display: grid;
      align-content: start;
      gap: 0.65rem;
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

    .ops-shell__fx {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }

    .ops-shell__brackets {
      position: absolute;
      inset: 0;
    }

    .ops-shell__bracket {
      position: absolute;
      width: 2.8rem;
      height: 2.8rem;
      border-color: rgb(255 255 255 / 0.82);
      border-style: solid;
      opacity: 0;
      animation: bracket-flash 820ms ease-out 1 forwards;
    }

    .ops-shell__bracket--tl {
      top: 0.85rem;
      left: 0.85rem;
      border-width: 2px 0 0 2px;
      border-top-left-radius: 1rem;
    }

    .ops-shell__bracket--tr {
      top: 0.85rem;
      right: 0.85rem;
      border-width: 2px 2px 0 0;
      border-top-right-radius: 1rem;
    }

    .ops-shell__bracket--bl {
      bottom: 0.85rem;
      left: 0.85rem;
      border-width: 0 0 2px 2px;
      border-bottom-left-radius: 1rem;
    }

    .ops-shell__bracket--br {
      right: 0.85rem;
      bottom: 0.85rem;
      border-width: 0 2px 2px 0;
      border-bottom-right-radius: 1rem;
    }

    .ops-shell__scanlines {
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(
          180deg,
          rgb(255 255 255 / 0.12) 0,
          rgb(255 255 255 / 0.12) 1px,
          transparent 1px,
          transparent 0.8rem
        );
      opacity: 0;
      animation: scanline-burst 620ms ease-out 1 forwards;
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

    .ops-shell__sweep--echo {
      width: 28%;
      left: -30%;
      opacity: 0;
      filter: blur(8px);
      animation-delay: 120ms;
    }

    .ops-shell__flash {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 24% 30%, rgb(0 143 180 / 0.16), transparent 28%),
        radial-gradient(circle at 76% 64%, rgb(216 137 31 / 0.12), transparent 24%);
      opacity: 0;
      animation: stage-flash 580ms ease-out 1 forwards;
    }

    .ops-shell--transitioning .ops-shell__stage {
      filter: saturate(1.04);
      box-shadow:
        var(--stage-shadow),
        0 0 0 1px rgb(0 143 180 / 0.08);
    }

    .ops-shell--transitioning .ops-shell__card,
    .ops-shell--transitioning .ops-shell__outlet {
      animation: card-shift 620ms ease-out 1;
    }

    .ops-shell--transitioning .ops-shell__card:nth-of-type(2) {
      animation-delay: 40ms;
    }

    .ops-shell--transitioning .ops-shell__card:nth-of-type(3) {
      animation-delay: 90ms;
    }

    .ops-shell__card,
    .ops-shell__outlet {
      padding: 0.78rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.95rem;
      background: rgb(255 255 255 / 0.72);
    }

    .ops-shell__label {
      margin: 0 0 0.45rem;
      color: var(--ink-soft);
      font-size: 0.7rem;
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
      line-height: 1.4;
      font-size: 0.9rem;
    }

    .ops-shell__toggle-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-top: 0.65rem;
    }

    .ops-shell__toggle {
      min-height: 2.2rem;
      padding: 0.5rem 0.7rem;
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
      gap: 0.55rem;
    }

    .ops-shell__nav-card {
      display: block;
      padding: 0.72rem 0.8rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.9rem;
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
      margin-top: 0.22rem;
      color: var(--ink-soft);
      line-height: 1.35;
      font-size: 0.88rem;
    }

    .ops-shell__nav-card:hover {
      transform: translateY(-1px);
      border-color: rgb(0 143 180 / 0.14);
      box-shadow: 0 12px 24px rgb(17 34 48 / 0.08);
    }

    .ops-shell__feed {
      display: grid;
      gap: 0.38rem;
      margin: 0;
      padding-left: 1rem;
    }

    .ops-shell__feed li {
      line-height: 1.32;
      font-size: 0.86rem;
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

    @keyframes stage-flash {
      from {
        opacity: 0;
      }

      18%,
      56% {
        opacity: 1;
      }

      to {
        opacity: 0;
      }
    }

    @keyframes scanline-burst {
      from {
        opacity: 0;
        transform: translateY(-0.8rem);
      }

      24%,
      78% {
        opacity: 0.7;
      }

      to {
        opacity: 0;
        transform: translateY(0.4rem);
      }
    }

    @keyframes bracket-flash {
      from {
        opacity: 0;
        transform: scale(0.84);
      }

      18%,
      64% {
        opacity: 1;
        transform: scale(1);
      }

      to {
        opacity: 0;
        transform: scale(0.96);
      }
    }

    @keyframes card-shift {
      0% {
        transform: translateX(0) scale(1);
        box-shadow: none;
      }

      18% {
        transform: translateX(0.35rem) scale(1.01);
        box-shadow: 0 0 0 1px rgb(0 143 180 / 0.08), 0 14px 28px rgb(17 34 48 / 0.08);
      }

      58% {
        transform: translateX(-0.18rem) scale(0.996);
      }

      100% {
        transform: translateX(0) scale(1);
        box-shadow: none;
      }
    }

    @keyframes ambient-ring {
      from {
        opacity: 0;
        transform: scale(0.68);
      }

      18%,
      60% {
        opacity: 1;
      }

      to {
        opacity: 0;
        transform: scale(1.18);
      }
    }

    @keyframes ambient-grid {
      from {
        opacity: 0;
        transform: scale(1.02);
      }

      16%,
      72% {
        opacity: 0.58;
      }

      to {
        opacity: 0;
        transform: scale(1);
      }
    }

    @media (max-width: 980px) {
      .ops-shell {
        grid-template-columns: 1fr;
        min-height: auto;
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
  private lastPhase: string | null = null;
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
    const phase = this.router.state.phase;

    if (phase !== null && this.lastPhase === null) {
      this.triggerSweep();
    }

    this.lastPhase = phase;
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
