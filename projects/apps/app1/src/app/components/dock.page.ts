import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@epikodelabs/switchboard';

import { OperationsRoomService } from '../services/operations-room.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="dock">
      <section class="dock__hero">
        <div class="dock__hero-copy">
          <p class="dock__eyebrow">Orbital relay</p>
          <h1>Frame traffic moving across a deep-space relay deck.</h1>
          <p class="dock__lede">
            This demo treats navigation like controlled frame transit. Mission and analysis are
            public docking points, handoff is an internal transfer lane, and debrief refuses direct
            insertion unless the graph actually delivered the user there.
          </p>

          <div class="dock__actions">
            <button
              type="button"
              class="dock__button dock__button--solid"
              (click)="openMission(207)"
            >
              Enter mission board
            </button>
            <button type="button" class="dock__button" (click)="openAnalysis(315)">
              Jump to lazy analysis
            </button>
            <a class="dock__button" [routerLink]="'/legacy'">Follow legacy redirect</a>
          </div>

          <div class="dock__metrics">
            <article class="dock__metric">
              <span>Public frames</span>
              <strong>3 beacons</strong>
            </article>
            <article class="dock__metric">
              <span>Silent transfer</span>
              <strong>1 internal lane</strong>
            </article>
            <article class="dock__metric">
              <span>History envelope</span>
              <strong>Address preserved</strong>
            </article>
          </div>
        </div>

        <aside class="dock__status">
          <p class="dock__panel-label">Relay status</p>

          <div class="dock__status-card">
            <span class="dock__status-label">Console lead</span>
            <strong>{{ currentOperator().name }}</strong>
            <small>{{ currentOperator().title }} | {{ currentOperator().callsign }}</small>
          </div>

          <dl class="dock__status-list">
            <div>
              <dt>Visible address</dt>
              <dd>Public beacons only</dd>
            </div>
            <div>
              <dt>Internal handoff</dt>
              <dd>Route graph gated</dd>
            </div>
            <div>
              <dt>Debrief entry</dt>
              <dd>Requires packet history</dd>
            </div>
          </dl>

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
        </aside>
      </section>

      <section class="dock__missions">
        <div class="dock__section-heading">
          <div>
            <p class="dock__panel-label">Beacon lineup</p>
            <h2>Launch into the graph from concrete mission addresses.</h2>
          </div>
          <span class="dock__section-tag">Frame ids + typed query payloads</span>
        </div>

        <div class="dock__mission-grid">
          @for (mission of room.missions; track mission.id) {
            <article class="dock__mission-card">
              <div class="dock__mission-topline">
                <span
                  class="dock__risk"
                  [class.dock__risk--watch]="mission.risk === 'watch'"
                  [class.dock__risk--critical]="mission.risk === 'critical'"
                >
                  {{ mission.risk }}
                </span>
                <span>#{{ mission.id }}</span>
              </div>

              <strong>{{ mission.codeName }}</strong>
              <p class="dock__mission-sector">{{ mission.sector }}</p>
              <p class="dock__mission-copy">{{ mission.headline }}</p>

              <div class="dock__mission-actions">
                <button
                  type="button"
                  class="dock__button dock__button--solid"
                  (click)="openMission(mission.id)"
                >
                  Mission
                </button>
                <button type="button" class="dock__button" (click)="openAnalysis(mission.id)">
                  Analysis
                </button>
              </div>
            </article>
          }
        </div>
      </section>

      <section class="dock__lower">
        <section class="dock__operator">
          <p class="dock__panel-label">Control station</p>
          <div class="dock__operator-row">
            <div>
              <strong>{{ currentOperator().name }}</strong>
              <span> {{ currentOperator().title }} | {{ currentOperator().callsign }} </span>
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

        <section class="dock__feed">
          <div class="dock__section-heading">
            <div>
              <p class="dock__panel-label">Live relay feed</p>
              <h2>Recent graph events</h2>
            </div>
          </div>

          <ul class="dock__feed-list">
            @for (event of room.eventFeed(); track event) {
              <li>{{ event }}</li>
            }
          </ul>
        </section>
      </section>

      <section class="dock__grid">
        <article class="dock__card">
          <strong>Frame graph first</strong>
          <p>
            Navigation begins with frame ids and transition edges. The address still exists, but it
            no longer owns the model.
          </p>
        </article>
        <article class="dock__card">
          <strong>Internal handoff</strong>
          <p>
            The handoff frame has no public beacon. Transit enters it with a frame target and
            payload while the visible address can stay stable.
          </p>
        </article>
        <article class="dock__card">
          <strong>Payload hop</strong>
          <p>
            Mission and analysis emit a packet object, then debrief consumes it from navigation
            state instead of leaking it into the address bar.
          </p>
        </article>
        <article class="dock__card">
          <strong>Visible pending phase</strong>
          <p>
            Async prep keeps transit pending long enough to inspect shell motion, staged loading,
            and a deliberate transition envelope.
          </p>
        </article>
        <article class="dock__card">
          <strong>Display URL split</strong>
          <p>
            Internal frame paths stay inside history state while the visible URL remains clean,
            stable, and user-facing.
          </p>
        </article>
        <article class="dock__card">
          <strong>Direct-entry rules</strong>
          <p>
            Public beacons may allow direct landing, while guarded internal stages can require
            graph-approved transit before they will render.
          </p>
        </article>
      </section>
    </section>
  `,
  styles: `
    .dock {
      display: grid;
      gap: 0.85rem;
      max-width: 92rem;
      margin: 0 auto;
      min-height: calc(100vh - 7.2rem);
      align-content: start;
    }

    .dock__hero,
    .dock__operator,
    .dock__missions,
    .dock__feed {
      position: relative;
      padding: clamp(0.95rem, 1.35vw, 1.2rem);
      border: 1px solid var(--line-soft);
      border-radius: 0.5rem;
      background:
        linear-gradient(145deg, rgb(23 19 14 / 0.96), rgb(11 9 6 / 0.92)), var(--panel-base);
      box-shadow: var(--stage-shadow);
      overflow: hidden;
    }

    .dock__hero::before,
    .dock__operator::before,
    .dock__missions::before,
    .dock__feed::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
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
      inset: auto 0 0 0;
      height: 2px;
      background: var(--ruler-ticks);
      opacity: 0.5;
      pointer-events: none;
    }

    .dock__hero {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 0.9fr);
      gap: 0.9rem;
      align-items: stretch;
    }

    .dock__hero-copy,
    .dock__status {
      position: relative;
      z-index: 1;
    }

    .dock__hero-copy {
      display: grid;
      align-content: start;
      gap: 0.75rem;
      min-width: 0;
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
      margin: 0;
      color: var(--ink-strong);
      font-size: clamp(2.05rem, 3.6vw, 3.3rem);
      line-height: 0.96;
    }

    .dock__lede {
      max-width: 50rem;
      margin: 0;
      font-size: 0.98rem;
      line-height: 1.58;
      color: var(--ink-soft);
    }

    .dock__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .dock__metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.65rem;
    }

    .dock__metric {
      padding: 0.78rem 0.85rem;
      border: 1px solid rgb(90 217 255 / 0.12);
      border-radius: 0.4rem;
      background: linear-gradient(180deg, rgb(19 15 11 / 0.88), rgb(9 7 5 / 0.82));
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.05),
        0 0 0 1px rgb(90 217 255 / 0.03);
    }

    .dock__metric span,
    .dock__metric strong {
      display: block;
    }

    .dock__metric span {
      color: var(--ink-soft);
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .dock__metric strong {
      margin-top: 0.28rem;
      color: var(--ink-strong);
      font-size: 0.95rem;
    }

    .dock__status {
      display: grid;
      gap: 0.75rem;
    }

    .dock__status-card {
      display: grid;
      gap: 0.18rem;
      padding: 0.88rem 0.92rem;
      border: 1px solid rgb(90 217 255 / 0.12);
      border-radius: 0.4rem;
      background: linear-gradient(180deg, rgb(20 16 12 / 0.9), rgb(10 8 6 / 0.86));
    }

    .dock__status-card strong,
    .dock__status-card small,
    .dock__status-label {
      display: block;
    }

    .dock__status-label {
      color: var(--signal-cyan);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .dock__status-card strong {
      color: var(--ink-strong);
      font-size: 1.05rem;
    }

    .dock__status-card small {
      color: var(--ink-soft);
      font-size: 0.86rem;
    }

    .dock__status-list {
      display: grid;
      gap: 0.5rem;
      margin: 0;
    }

    .dock__status-list div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.8rem;
      padding: 0.68rem 0.8rem;
      border: 1px solid rgb(255 255 255 / 0.05);
      border-radius: 0.35rem;
      background: rgb(5 15 26 / 0.72);
    }

    .dock__status-list dt {
      color: var(--ink-soft);
      font-size: 0.82rem;
    }

    .dock__status-list dd {
      margin: 0;
      color: var(--ink-strong);
      font-weight: 700;
      font-size: 0.82rem;
      text-align: right;
    }

    .dock__button {
      display: inline-flex;
      position: relative;
      align-items: center;
      justify-content: center;
      min-height: 2.45rem;
      padding: 0.58rem 0.82rem;
      border: 1px solid rgb(90 217 255 / 0.16);
      border-radius: 0.3rem;
      background: rgb(21 17 12 / 0.88);
      color: var(--ink-strong);
      font-weight: 700;
      text-decoration: none;
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
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-cyan-dim));
      color: var(--signal-deep);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.16),
        0 14px 24px rgb(90 217 255 / 0.18);
    }

    .dock__button:hover,
    .dock__toggle:hover {
      transform: translateY(-1px);
      border-color: rgb(90 217 255 / 0.26);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.06),
        0 12px 24px rgb(0 0 0 / 0.24),
        0 0 0 1px rgb(90 217 255 / 0.08);
    }

    .dock__button:active,
    .dock__toggle:active {
      transform: translateY(1px);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.03),
        0 0 0 1px rgb(90 217 255 / 0.08);
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

    .dock__toggle--active {
      border-color: transparent;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-cyan-dim));
      color: var(--signal-deep);
    }

    .dock__section-heading {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      justify-content: space-between;
      gap: 0.85rem;
      margin-bottom: 0.85rem;
    }

    .dock__section-heading h2 {
      margin: 0;
      color: var(--ink-strong);
      font-size: clamp(1.1rem, 1.55vw, 1.45rem);
      line-height: 1.05;
    }

    .dock__section-tag {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.4rem 0.72rem;
      border: 1px solid rgb(90 217 255 / 0.14);
      border-radius: 0.3rem;
      background: rgb(19 15 10 / 0.78);
      color: var(--ink-soft);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dock__mission-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 0.75rem;
    }

    .dock__mission-card {
      display: grid;
      gap: 0.55rem;
      padding: 0.88rem 0.92rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.4rem;
      background: linear-gradient(180deg, rgb(21 17 12 / 0.94), rgb(10 8 6 / 0.88));
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 0.05),
        0 16px 28px rgb(0 0 0 / 0.14);
    }

    .dock__mission-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      color: var(--ink-soft);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dock__risk {
      display: inline-flex;
      align-items: center;
      min-height: 1.65rem;
      padding: 0.2rem 0.55rem;
      border-radius: 0.3rem;
      background: rgb(47 128 148 / 0.14);
      color: rgb(88, 127, 141);
      font-weight: 700;
    }

    .dock__risk--watch {
      background: rgb(255 180 84 / 0.14);
      color: rgb(177, 142, 104);
    }

    .dock__risk--critical {
      background: rgb(255 84 112 / 0.14);
      color: rgb(156, 86, 95);
    }

    .dock__mission-card strong {
      color: var(--ink-strong);
      font-size: 1rem;
    }

    .dock__mission-sector,
    .dock__mission-copy {
      margin: 0;
    }

    .dock__mission-sector {
      color: var(--signal-cyan);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dock__mission-copy {
      color: var(--ink-soft);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .dock__mission-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .dock__lower {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
      gap: 0.85rem;
      align-items: start;
    }

    .dock__feed-list {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 0.55rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .dock__feed-list li {
      position: relative;
      padding: 0.72rem 0.84rem 0.72rem 1rem;
      border: 1px solid rgb(255 255 255 / 0.05);
      border-radius: 0.35rem;
      background: rgb(11 9 6 / 0.76);
      line-height: 1.45;
    }

    .dock__feed-list li::before {
      content: '';
      position: absolute;
      inset: 0.95rem auto auto 0.55rem;
      width: 0.34rem;
      height: 0.34rem;
      border-radius: 0.3rem;
      background: linear-gradient(135deg, var(--signal-cyan), var(--signal-cyan-dim));
      box-shadow: 0 0 0 0.22rem rgb(0 143 180 / 0.12);
    }

    .dock__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 0.75rem;
    }

    .dock__card {
      padding: 0.88rem 0.94rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.4rem;
      background: linear-gradient(180deg, rgb(22 18 13 / 0.94), rgb(10 8 6 / 0.9));
      box-shadow: var(--stage-shadow);
    }

    .dock__card strong {
      display: block;
      margin-bottom: 0.45rem;
      color: var(--ink-strong);
    }

    .dock__card p {
      margin: 0;
      line-height: 1.5;
      font-size: 0.9rem;
      color: var(--ink-soft);
    }

    @media (max-width: 980px) {
      .dock__hero,
      .dock__lower {
        grid-template-columns: 1fr;
      }

      .dock__metrics {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .dock {
        gap: 0.75rem;
      }

      h1 {
        font-size: clamp(1.8rem, 9vw, 2.5rem);
      }

      .dock__section-heading,
      .dock__operator-row,
      .dock__status-list div {
        align-items: start;
      }

      .dock__status-list div {
        flex-direction: column;
      }

      .dock__status-list dd {
        text-align: left;
      }
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
