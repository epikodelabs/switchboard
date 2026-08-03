import {
  Component,
  inject,
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
          <p class="ops-shell__label">Flight cell</p>
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
          <p class="ops-shell__label">Transit rule</p>
          <strong>{{ activeFrame() }}</strong>
          <p>
            Handoff runs as an internal relay segment. The active frame changes,
            while the public beacon can remain on the previous mission or analysis
            address.
          </p>
        </div>

        <section class="ops-shell__outlet">
          <p class="ops-shell__label">Companion panel</p>
          <router-outlet name="sidebar" />
        </section>

        <div class="ops-shell__card">
          <p class="ops-shell__label">Telemetry</p>
          <ul class="ops-shell__feed">
            @for (event of room.eventFeed(); track $index) {
              <li>{{ event }}</li>
            }
          </ul>
        </div>
      </aside>

      <main class="ops-shell__stage">
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

    .ops-shell__rail,
    .ops-shell__stage {
      min-width: 0;
      padding: 0.75rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.5rem;
      background:
        linear-gradient(180deg, rgb(22 18 13 / 0.94), rgb(9 7 5 / 0.9)),
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
        transform 220ms ease;
      animation: stage-idle 6.8s ease-in-out infinite;
    }

    .ops-shell__stage::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgb(90 217 255 / 0), rgb(90 217 255 / 0.08), rgb(255 180 84 / 0.06), rgb(255 180 84 / 0)),
        linear-gradient(180deg, rgb(255 255 255 / 0.02), rgb(255 255 255 / 0));
      transform: translateX(-100%);
      opacity: 0;
    }

    .ops-shell__content {
      position: relative;
      z-index: 1;
      transition:
        transform 220ms ease,
        opacity 220ms ease;
    }

    .ops-shell--transitioning .ops-shell__stage {
      transform: translateY(-1px);
      box-shadow:
        var(--stage-shadow),
        0 0 0 1px rgb(90 217 255 / 0.08);
    }

    .ops-shell--transitioning .ops-shell__stage::after {
      animation: stage-pass 520ms cubic-bezier(0.22, 1, 0.36, 1) 1;
    }

    .ops-shell--transitioning .ops-shell__content {
      transform: scale(0.996);
      opacity: 0.92;
    }

    .ops-shell__card,
    .ops-shell__outlet {
      padding: 0.78rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background:
        linear-gradient(180deg, rgb(21 17 12 / 0.94), rgb(11 9 6 / 0.9));
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
      position: relative;
      min-height: 2.2rem;
      padding: 0.5rem 0.7rem;
      border: 1px solid rgb(90 217 255 / 0.16);
      border-radius: 0.3rem;
      background: rgb(20 16 11 / 0.9);
      color: var(--ink-strong);
      font-weight: 700;
      cursor: pointer;
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.05),
        0 0 0 1px rgb(90 217 255 / 0.03);
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .ops-shell__toggle::before,
    .ops-shell__nav-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0));
      pointer-events: none;
    }

    .ops-shell__toggle--active {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-cyan-dim));
      color: var(--signal-deep);
    }

    .ops-shell__mission-grid {
      display: grid;
      gap: 0.55rem;
    }

    .ops-shell__nav-card {
      position: relative;
      display: block;
      padding: 0.72rem 0.8rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background:
        linear-gradient(180deg, rgb(20 16 11 / 0.94), rgb(9 7 5 / 0.9));
      text-decoration: none;
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.04),
        0 0 0 1px rgb(90 217 255 / 0.02);
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
      border-color: rgb(90 217 255 / 0.14);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.05),
        0 12px 24px rgb(0 0 0 / 0.22),
        0 0 0 1px rgb(90 217 255 / 0.08);
    }

    .ops-shell__toggle:hover {
      transform: translateY(-1px);
      border-color: rgb(90 217 255 / 0.26);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.06),
        0 10px 22px rgb(0 0 0 / 0.22),
        0 0 0 1px rgb(90 217 255 / 0.08);
    }

    .ops-shell__nav-card:active,
    .ops-shell__toggle:active {
      transform: translateY(1px);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.03),
        0 0 0 1px rgb(90 217 255 / 0.08);
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

    @keyframes stage-pass {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }

      20%,
      72% {
        opacity: 1;
      }

      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes stage-idle {
      0%,
      100% {
        box-shadow:
          var(--stage-shadow),
          0 0 0 1px rgb(90 217 255 / 0.03);
      }

      50% {
        box-shadow:
          var(--stage-shadow),
          0 0 0 1px rgb(90 217 255 / 0.08),
          0 0 24px rgb(90 217 255 / 0.05);
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
export class OpsShellPage {
  private readonly router = inject(Router);
  protected readonly room = inject(OperationsRoomService);

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

  protected activeFrame(): string {
    return String(
      this.router.state.current?.config.name
      ?? this.router.state.routeConfig?.name
      ?? 'dock',
    );
  }
}

