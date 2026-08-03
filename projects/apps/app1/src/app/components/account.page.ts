import { Component, inject, input, signal, effect } from '@angular/core';
import { Router, RouterLink } from '@epikodelabs/switchboard';
import { DataInput, ParamsInput, QueryInput } from './route-inputs';
import { sceneStyles } from './scene-styles';
import { Account, LedgerLine, LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Account ledger</p>
          <h1 class="scene-title">
            {{ account()?.code }} · {{ account()?.name ?? 'Unknown' }}
          </h1>
          <p class="scene-copy">
            Running balance for this account. Click any entry to open the journal voucher.
          </p>
        </div>
        <span class="status-chip">{{ account()?.type ?? '—' }}</span>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Balance</span>
          <strong>{{ money(balance()) }}</strong>
        </article>
        <article class="metric">
          <span>Lines</span>
          <strong>{{ lines().length }}</strong>
        </article>
        <article class="metric">
          <span>Currency</span>
          <strong>{{ account()?.currency ?? 'USD' }}</strong>
        </article>
        <article class="metric">
          <span>Status</span>
          <strong>{{ account()?.archived ? 'Archived' : 'Active' }}</strong>
        </article>
      </div>

      <div class="action-row">
        <a class="action-link action-link--accent" [routerLink]="{ name: 'journal', query: { accountId: accountId() } }">
          New entry for this account
        </a>
        <a class="action-link" [routerLink]="{ name: 'books' }">Back to books</a>
        <a class="action-link" [routerLink]="{ name: 'trial' }">Trial balance</a>
        @if (account() && !account()!.archived) {
          <button type="button" class="action-button" (click)="archive()">Archive</button>
        }
      </div>

      @if (lines().length === 0) {
        <p class="empty-state">No posted activity on this account yet.</p>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Description</th>
              <th class="num">Debit</th>
              <th class="num">Credit</th>
              <th class="num">Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (row of lines(); track $index) {
              <tr>
                <td>{{ row.date }}</td>
                <td>{{ row.reference }}</td>
                <td>{{ row.description }}</td>
                <td class="num">{{ row.debit ? money(row.debit) : '—' }}</td>
                <td class="num">{{ row.credit ? money(row.credit) : '—' }}</td>
                <td class="num">{{ money(row.balance) }}</td>
                <td>
                  <a [routerLink]="{ name: 'entry', params: { entryId: row.entryId } }">View</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [sceneStyles],
})
export class AccountPage {
  private readonly ledger = inject(LedgerService);
  private readonly router = inject(Router);

  protected readonly params = input<ParamsInput>({});
  protected readonly query = input<QueryInput>({});
  protected readonly data = input<DataInput>({});

  protected readonly account = signal<Account | null>(null);
  protected readonly lines = signal<LedgerLine[]>([]);
  protected readonly balance = signal(0);

  constructor() {
    effect(() => {
      const id = String(this.params()['accountId'] ?? '');
      if (!id) return;
      void this.ledger.prepareAccount(id).then(result => {
        this.account.set(result.account);
        this.lines.set([...result.lines]);
        this.balance.set(result.balance);
      });
    });
  }

  protected accountId(): string {
    return String(this.params()['accountId'] ?? '');
  }

  protected money(n: number): string {
    return this.ledger.formatMoney(n);
  }

  protected archive(): void {
    const a = this.account();
    if (!a) return;
    if (confirm('Archive account ' + a.code + ' ' + a.name + '?')) {
      this.ledger.updateAccount(a.id, { archived: true });
      void this.router.navigate({ frame: 'books' });
    }
  }
}
