import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';
import { ParamsInput } from './route-inputs';
import { sidebarStyles } from './scene-styles';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="sidebar-stack">
      <article class="sidebar-card">
        <h3>Related</h3>
        <div class="sidebar-links">
          <a [routerLink]="{ name: 'journal', query: { accountId: accountId() } }">Post to this account</a>
          <a [routerLink]="{ name: 'books' }">All accounts</a>
          <a [routerLink]="{ name: 'trial' }">Trial balance</a>
        </div>
      </article>
      <article class="sidebar-card">
        <h3>Other accounts</h3>
        <div class="sidebar-links">
          @for (a of ledger.activeAccounts().slice(0, 8); track a.id) {
            <a [routerLink]="{ name: 'account', params: { accountId: a.id } }">{{ a.code }} {{ a.name }}</a>
          }
        </div>
      </article>
    </section>
  `,
  styles: [sidebarStyles],
})
export class AccountSidebarComponent {
  protected readonly ledger = inject(LedgerService);
  protected readonly params = input<ParamsInput>({});

  protected accountId(): string {
    return String(this.params()['accountId'] ?? '');
  }
}
