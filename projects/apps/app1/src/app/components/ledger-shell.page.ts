import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@epikodelabs/switchboard';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <section class="ops-shell" [class.ops-shell--transitioning]="isTransitioning()">
      <aside class="ops-shell__rail">
        <div class="ops-shell__card">
          <p class="ops-shell__label">Workspace</p>
          <strong>General Ledger</strong>
          <span>{{ ledger.periodLabel() }} · {{ ledger.baseCurrency() }}</span>
        </div>

        <nav class="ops-shell__mission-grid" aria-label="Primary">
          <a class="ops-shell__nav-card" [routerLink]="{ name: 'books' }">
            <strong>Books</strong>
            <span>Accounts & activity</span>
          </a>
          <a class="ops-shell__nav-card" [routerLink]="{ name: 'journal' }">
            <strong>Journal</strong>
            <span>New / edit entry</span>
          </a>
          <a class="ops-shell__nav-card" [routerLink]="{ name: 'trial' }">
            <strong>Trial balance</strong>
            <span>Prove the books</span>
          </a>
          <a class="ops-shell__nav-card" [routerLink]="{ name: 'settings' }">
            <strong>Settings</strong>
            <span>Period & reset</span>
          </a>
        </nav>

        <div class="ops-shell__card">
          <p class="ops-shell__label">Cash</p>
          <strong>{{ ledger.formatMoney(ledger.accountBalance('a-1000')) }}</strong>
          <p>{{ ledger.draftEntries().length }} open draft(s)</p>
        </div>

        <section class="ops-shell__outlet">
          <p class="ops-shell__label">Companion</p>
          <router-outlet name="sidebar" />
        </section>

        <div class="ops-shell__card">
          <p class="ops-shell__label">Activity</p>
          <ul class="ops-shell__feed">
            @for (ev of ledger.events().slice(0, 5); track ev.id) {
              <li>{{ ev.message }}</li>
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
  styles: [`
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
        linear-gradient(180deg, rgb(255 252 247 / 0.98), rgb(247 241 232 / 0.95)),
        var(--panel-base);
      box-shadow: var(--stage-shadow);
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
      background:
        linear-gradient(180deg, rgb(255 252 247 / 0.99), rgb(250 245 236 / 0.97)),
        var(--panel-strong);
    }
    .ops-shell__content { position: relative; z-index: 1; }
    .ops-shell--transitioning .ops-shell__stage {
      box-shadow: var(--stage-shadow), 0 0 0 1px rgb(184 107 60 / 0.18);
    }
    .ops-shell__card,
    .ops-shell__outlet {
      padding: 0.78rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background: linear-gradient(180deg, rgb(255 252 247 / 0.98), rgb(247 241 232 / 0.94));
    }
    .ops-shell__label {
      margin: 0 0 0.45rem;
      color: var(--ink-soft);
      font-size: 0.7rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .ops-shell__card strong,
    .ops-shell__card span { display: block; }
    .ops-shell__card strong { color: var(--ink-strong); }
    .ops-shell__card span,
    .ops-shell__card p {
      color: var(--ink-soft);
      line-height: 1.4;
      font-size: 0.9rem;
    }
    .ops-shell__mission-grid { display: grid; gap: 0.55rem; }
    .ops-shell__nav-card {
      position: relative;
      display: block;
      padding: 0.72rem 0.8rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background: linear-gradient(180deg, rgb(255 252 247 / 0.98), rgb(250 245 236 / 0.95));
      text-decoration: none;
      color: inherit;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }
    .ops-shell__nav-card strong,
    .ops-shell__nav-card span { display: block; }
    .ops-shell__nav-card strong { color: var(--ink-strong); }
    .ops-shell__nav-card span {
      margin-top: 0.22rem;
      color: var(--ink-soft);
      font-size: 0.88rem;
    }
    .ops-shell__nav-card:hover {
      border-color: rgb(184 107 60 / 0.35);
      box-shadow: 0 6px 16px rgb(120 90 55 / 0.08);
    }
    .ops-shell__feed {
      display: grid;
      gap: 0.38rem;
      margin: 0;
      padding-left: 1rem;
      color: var(--ink-soft);
    }
    .ops-shell__feed li {
      line-height: 1.32;
      font-size: 0.86rem;
    }
    @media (max-width: 980px) {
      .ops-shell {
        grid-template-columns: 1fr;
        min-height: auto;
      }
    }
  `],
})
export class LedgerShellPage {
  private readonly router = inject(Router);
  protected readonly ledger = inject(LedgerService);

  protected isTransitioning(): boolean {
    return this.router.state.pending;
  }
}
