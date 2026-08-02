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
        <p class="dock__eyebrow">Showcase</p>
        <h1>Addressable frames, internal frames, and visible transition work.</h1>
        <p class="dock__lede">
          App3 is a frame-first demo rather than a route playground. Mission and
          analysis are addressable, handoff is internal-only, and debrief rejects
          direct entry unless the graph reaches it through a transition.
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
            Navigation targets use frame ids. URL projection stays available, but
            the flow is described by transitions between frames.
          </p>
        </article>
        <article class="dock__card">
          <strong>Internal handoff</strong>
          <p>
            The handoff frame is mounted without an address entry. You move into it
            with a frame target and payload while the browser address stays public.
          </p>
        </article>
        <article class="dock__card">
          <strong>Payload hop</strong>
          <p>
            Mission and analysis open a packet object, then debrief consumes that
            payload through history state instead of stuffing it into the address.
          </p>
        </article>
        <article class="dock__card">
          <strong>Visible pending phase</strong>
          <p>
            Async prepares keep navigation pending long enough to inspect shell
            motion, view transitions, and staged loading behavior.
          </p>
        </article>
      </section>
    </section>
  `,
  styles: `
    .dock {
      display: grid;
      gap: 1rem;
      max-width: 92rem;
      margin: 0 auto;
    }

    .dock__hero,
    .dock__operator {
      padding: clamp(1.2rem, 2vw, 1.8rem);
      border: 1px solid var(--line-soft);
      border-radius: 1.8rem;
      background:
        linear-gradient(145deg, rgb(255 255 255 / 0.92), rgb(243 249 252 / 0.8)),
        var(--panel-base);
      box-shadow: var(--stage-shadow);
      overflow: hidden;
      position: relative;
    }

    .dock__hero::after {
      content: '';
      position: absolute;
      inset: auto -5rem -5rem auto;
      width: 18rem;
      height: 18rem;
      border-radius: 999px;
      background: radial-gradient(circle, rgb(0 143 180 / 0.18), transparent 70%);
      pointer-events: none;
    }

    .dock__eyebrow,
    .dock__panel-label {
      margin: 0 0 0.8rem;
      color: var(--signal-cyan);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 52rem;
      margin: 0;
      color: var(--ink-strong);
      font-size: clamp(2.4rem, 5vw, 4.5rem);
      line-height: 0.93;
    }

    .dock__lede {
      max-width: 48rem;
      margin: 1rem 0 0;
      font-size: 1.04rem;
      line-height: 1.74;
    }

    .dock__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      margin-top: 1.7rem;
    }

    .dock__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 3rem;
      padding: 0.8rem 1.05rem;
      border: 1px solid rgb(0 143 180 / 0.16);
      border-radius: 999px;
      background: rgb(255 255 255 / 0.82);
      color: var(--signal-deep);
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease;
    }

    .dock__button--solid {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
      color: #fff;
      box-shadow: 0 14px 24px rgb(0 143 180 / 0.18);
    }

    .dock__button:hover,
    .dock__toggle:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 24px rgb(17 34 48 / 0.1);
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
      margin-top: 0.3rem;
    }

    .dock__toggle-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .dock__toggle {
      min-height: 2.7rem;
      padding: 0.68rem 0.92rem;
      border: 1px solid rgb(0 143 180 / 0.16);
      border-radius: 999px;
      background: rgb(255 255 255 / 0.84);
      color: var(--signal-deep);
      font-weight: 700;
      cursor: pointer;
    }

    .dock__toggle--active {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-teal));
      color: #fff;
    }

    .dock__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
      gap: 1rem;
    }

    .dock__card {
      padding: 1.15rem;
      border: 1px solid var(--line-soft);
      border-radius: 1.3rem;
      background: rgb(255 255 255 / 0.76);
      box-shadow: var(--stage-shadow);
    }

    .dock__card strong {
      display: block;
      margin-bottom: 0.7rem;
      color: var(--ink-strong);
    }

    .dock__card p {
      margin: 0;
      line-height: 1.65;
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
