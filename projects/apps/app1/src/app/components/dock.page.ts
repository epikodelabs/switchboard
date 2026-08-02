import {
  Component,
  inject,
} from '@angular/core';
import {
  Router,
  RouterLink,
} from '@epikodelabs/switchboard';

import { OperationsRoomService } from '../services/operations-room.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="dock">
      <div class="dock__hero">
        <p class="dock__eyebrow">Orbital relay</p>
        <h1>Frame traffic moving across a deep-space relay deck.</h1>
        <p class="dock__lede">
          This demo treats navigation like controlled frame transit. Mission and
          analysis are public docking points, handoff is an internal transfer lane,
          and debrief refuses direct insertion unless the graph actually delivered
          the user there.
        </p>

        <div class="dock__actions">
          <button
            type="button"
            class="dock__button dock__button--solid"
            (click)="openMission(207)"
          >
            Enter mission board
          </button>
          <button
            type="button"
            class="dock__button"
            (click)="openAnalysis(315)"
          >
            Jump to lazy analysis
          </button>
          <a class="dock__button" [routerLink]="'/legacy'">Follow legacy redirect</a>
        </div>
      </div>

      <section class="dock__operator">
        <p class="dock__panel-label">Control station</p>
        <div class="dock__operator-row">
          <div>
            <strong>{{ currentOperator().name }}</strong>
            <span>
              {{ currentOperator().title }} | {{ currentOperator().callsign }}
            </span>
          </div>
          <div class="dock__toggle-row">
            @for (operator of room.operators; track operator.id) {
              <button
                type="button"
                class="dock__toggle"
                [class.dock__toggle--active]="operator.id === currentOperator().id"
                (click)="selectOperator(operator.id)"
              >
                {{ operator.callsign }}
              </button>
            }
          </div>
        </div>
      </section>

      <section class="dock__grid">
        <article class="dock__card">
          <strong>Frame graph first</strong>
          <p>
            Navigation begins with frame ids and transition edges. The address still
            exists, but it no longer owns the model.
          </p>
        </article>
        <article class="dock__card">
          <strong>Internal handoff</strong>
          <p>
            The handoff frame has no public beacon. Transit enters it with a frame
            target and payload while the visible address can stay stable.
          </p>
        </article>
        <article class="dock__card">
          <strong>Payload hop</strong>
          <p>
            Mission and analysis emit a packet object, then debrief consumes it from
            navigation state instead of leaking it into the address bar.
          </p>
        </article>
        <article class="dock__card">
          <strong>Visible pending phase</strong>
          <p>
            Async prep keeps transit pending long enough to inspect shell motion,
            staged loading, and a deliberate transition envelope.
          </p>
        </article>
      </section>
    </section>
  `,
  styles: `
    .dock {
      display: grid;
      gap: 0.7rem;
      max-width: 92rem;
      margin: 0 auto;
      min-height: calc(100vh - 7.2rem);
      align-content: start;
    }

    .dock__hero,
    .dock__operator {
      position: relative;
      padding: clamp(0.9rem, 1.2vw, 1.15rem);
      border: 1px solid var(--line-soft);
      border-radius: 1.25rem;
      background:
        linear-gradient(145deg, rgb(11 24 39 / 0.96), rgb(6 16 28 / 0.92)),
        var(--panel-base);
      box-shadow: var(--stage-shadow);
      overflow: hidden;
    }

    .dock__hero::before,
    .dock__operator::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(
          90deg,
          rgb(255 255 255 / 0.03) 0,
          rgb(255 255 255 / 0.03) 1px,
          transparent 1px,
          transparent 2.4rem
        );
      pointer-events: none;
    }

    .dock__hero::after {
      content: '';
      position: absolute;
      inset: auto -5rem -5rem auto;
      width: 18rem;
      height: 18rem;
      border-radius: 999px;
      background: radial-gradient(circle, rgb(71 216 255 / 0.18), transparent 70%);
      pointer-events: none;
    }

    .dock__eyebrow,
    .dock__panel-label {
      margin: 0 0 0.45rem;
      color: var(--signal-cyan);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 52rem;
      margin: 0;
      color: var(--ink-strong);
      font-size: clamp(1.8rem, 3vw, 2.7rem);
      line-height: 0.96;
    }

    .dock__lede {
      max-width: 48rem;
      margin: 0.5rem 0 0;
      font-size: 0.94rem;
      line-height: 1.45;
    }

    .dock__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-top: 0.9rem;
    }

    .dock__button {
      display: inline-flex;
      position: relative;
      align-items: center;
      justify-content: center;
      min-height: 2.45rem;
      padding: 0.58rem 0.82rem;
      border: 1px solid rgb(71 216 255 / 0.16);
      border-radius: 999px;
      background: rgb(9 21 36 / 0.88);
      color: var(--ink-strong);
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.05),
        0 0 0 1px rgb(71 216 255 / 0.03);
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .dock__button::before,
    .dock__toggle::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0));
      pointer-events: none;
    }

    .dock__button--solid {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
      color: #03111d;
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.16),
        0 14px 24px rgb(71 216 255 / 0.18);
    }

    .dock__button:hover,
    .dock__toggle:hover {
      transform: translateY(-1px);
      border-color: rgb(71 216 255 / 0.26);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.06),
        0 12px 24px rgb(0 0 0 / 0.24),
        0 0 0 1px rgb(71 216 255 / 0.08);
    }

    .dock__button:active,
    .dock__toggle:active {
      transform: translateY(1px);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.03),
        0 0 0 1px rgb(71 216 255 / 0.08);
    }

    .dock__operator-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.9rem;
    }

    .dock__operator-row strong,
    .dock__operator-row span {
      display: block;
    }

    .dock__operator-row span {
      color: var(--ink-soft);
      margin-top: 0.18rem;
      font-size: 0.9rem;
    }

    .dock__toggle-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .dock__toggle {
      position: relative;
      min-height: 2.2rem;
      padding: 0.5rem 0.72rem;
      border: 1px solid rgb(71 216 255 / 0.16);
      border-radius: 999px;
      background: rgb(8 20 35 / 0.84);
      color: var(--ink-strong);
      font-weight: 700;
      cursor: pointer;
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.05),
        0 0 0 1px rgb(71 216 255 / 0.03);
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .dock__toggle--active {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
      color: #03111d;
    }

    .dock__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
      gap: 0.7rem;
    }

    .dock__card {
      padding: 0.78rem 0.88rem;
      border: 1px solid var(--line-soft);
      border-radius: 1rem;
      background:
        linear-gradient(180deg, rgb(10 22 37 / 0.94), rgb(6 15 26 / 0.9));
      box-shadow: var(--stage-shadow);
    }

    .dock__card strong {
      display: block;
      margin-bottom: 0.45rem;
      color: var(--ink-strong);
    }

    .dock__card p {
      margin: 0;
      line-height: 1.38;
      font-size: 0.9rem;
    }
  `,
})
export class DockPage {
  private readonly router = inject(Router);
  protected readonly room = inject(OperationsRoomService);

  protected currentOperator() {
    return this.room.currentOperator();
  }

  protected selectOperator(operatorId: string): void {
    this.room.selectOperator(operatorId);
  }

  protected openMission(missionId: number): void {
    void this.router.navigate({
      frame: 'mission',
      params: {
        missionId,
      },
      query: {
        lane: 'thermal',
        zoom: 2,
      },
    });
  }

  protected openAnalysis(missionId: number): void {
    void this.router.navigate({
      frame: 'analysis',
      params: {
        missionId,
      },
      query: {
        lens: 'echo',
        detail: 3,
      },
    });
  }
}
