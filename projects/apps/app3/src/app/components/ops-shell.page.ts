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
            @for (event of room.eventFeed(); track event) {
              <li>{{ event }}</li>
            }
          </ul>
        </div>
      </aside>

      <main class="ops-shell__stage">
        <router-outlet />
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
      overflow: hidden;
      transition:
        transform 220ms ease,
        box-shadow 220ms ease,
        filter 220ms ease;
    }

    .ops-shell__stage::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(110deg, transparent 30%, rgb(255 255 255 / 0.5) 50%, transparent 70%);
      opacity: 0;
      pointer-events: none;
    }

    .ops-shell--transitioning .ops-shell__stage {
      transform: scale(0.996) translateY(-1px);
      filter: saturate(1.05);
      box-shadow:
        var(--stage-shadow),
        0 0 0 1px rgb(0 143 180 / 0.08);
    }

    .ops-shell--transitioning .ops-shell__stage::after {
      animation: stage-sweep 880ms cubic-bezier(0.18, 1, 0.32, 1) 1 forwards;
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
        transform: translateX(-100%);
        opacity: 0;
      }

      20%,
      80% {
        opacity: 1;
      }

      to {
        transform: translateX(100%);
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
    return String(this.router.state.routeConfig?.name ?? 'dock');
  }
}
