import { Component, inject } from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';
import { sceneStyles } from './scene-styles';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Workspace</p>
          <h1 class="scene-title">Settings</h1>
          <p class="scene-copy">
            Period label, currency, and demo data controls. Data is stored in localStorage.
          </p>
        </div>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Period</span>
          <strong>{{ ledger.periodLabel() }}</strong>
        </article>
        <article class="metric">
          <span>Base currency</span>
          <strong>{{ ledger.baseCurrency() }}</strong>
        </article>
        <article class="metric">
          <span>Accounts</span>
          <strong>{{ ledger.accounts().length }}</strong>
        </article>
        <article class="metric">
          <span>Entries</span>
          <strong>{{ ledger.entries().length }}</strong>
        </article>
      </div>

      <div class="panel">
        <h3>Activity log</h3>
        <ul style="margin:0;padding-left:1.1rem;display:grid;gap:0.35rem;">
          @for (ev of ledger.events(); track ev.id) {
            <li style="font-size:0.88rem;color:var(--ink-soft);">
              <strong style="color:var(--ink-strong);">{{ ev.at.slice(0, 19).replace('T', ' ') }}</strong>
              — {{ ev.message }}
            </li>
          } @empty {
            <li>No events yet.</li>
          }
        </ul>
      </div>

      <div class="action-row">
        <button type="button" class="action-button action-button--danger" (click)="reset()">Reset demo data</button>
        <a class="action-link" [routerLink]="{ name: 'books' }">Back to books</a>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class SettingsPage {
  protected readonly ledger = inject(LedgerService);

  protected reset(): void {
    if (confirm('Reset all ledger data to the demo seed? This cannot be undone.')) {
      this.ledger.resetToSeed();
    }
  }
}
