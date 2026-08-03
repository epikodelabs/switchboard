import { Component, inject } from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';
import { sidebarStyles } from './scene-styles';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="sidebar-stack">
      <article class="sidebar-card">
        <h3>Quick links</h3>
        <div class="sidebar-links">
          <a [routerLink]="{ name: 'journal' }">New journal entry</a>
          <a [routerLink]="{ name: 'trial' }">Trial balance</a>
          <a [routerLink]="{ name: 'settings' }">Settings</a>
        </div>
      </article>
      <article class="sidebar-card">
        <h3>Drafts</h3>
        <div class="sidebar-links">
          @for (e of ledger.draftEntries(); track e.id) {
            <a [routerLink]="{ name: 'journal', query: { entryId: e.id } }">{{ e.reference || e.id }}</a>
          } @empty {
            <p>No open drafts.</p>
          }
        </div>
      </article>
      <article class="sidebar-card">
        <h3>Cash position</h3>
        <p>{{ ledger.formatMoney(ledger.accountBalance('a-1000')) }}</p>
      </article>
    </section>
  `,
  styles: [sidebarStyles],
})
export class BooksSidebarComponent {
  protected readonly ledger = inject(LedgerService);
}
