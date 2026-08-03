import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@epikodelabs/switchboard';
import { sceneStyles } from './scene-styles';
import { LedgerService, TrialBalanceRow } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Report</p>
          <h1 class="scene-title">Trial balance</h1>
          <p class="scene-copy">
            Posted activity only. Debit and credit columns should prove equal.
          </p>
        </div>
        <div class="action-row">
          <a class="action-link" [routerLink]="{ name: 'books' }">Books</a>
          <a class="action-link action-link--accent" [routerLink]="{ name: 'journal' }">New entry</a>
        </div>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Total debits</span>
          <strong>{{ money(totalDebit()) }}</strong>
        </article>
        <article class="metric">
          <span>Total credits</span>
          <strong>{{ money(totalCredit()) }}</strong>
        </article>
        <article class="metric">
          <span>Difference</span>
          <strong>{{ money(Math.abs(totalDebit() - totalCredit())) }}</strong>
        </article>
        <article class="metric">
          <span>Accounts</span>
          <strong>{{ rows().length }}</strong>
        </article>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Account</th>
            <th>Type</th>
            <th class="num">Debit</th>
            <th class="num">Credit</th>
            <th class="num">Balance</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.accountId) {
            <tr>
              <td>
                <a [routerLink]="{ name: 'account', params: { accountId: row.accountId } }">{{ row.code }}</a>
              </td>
              <td>{{ row.name }}</td>
              <td>{{ row.type }}</td>
              <td class="num">{{ row.debit ? money(row.debit) : '—' }}</td>
              <td class="num">{{ row.credit ? money(row.credit) : '—' }}</td>
              <td class="num">{{ money(row.balance) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty-state">No posted balances yet.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [sceneStyles],
})
export class TrialPage {
  private readonly ledger = inject(LedgerService);
  protected readonly rows = signal<TrialBalanceRow[]>([]);
  protected readonly Math = Math;

  constructor() {
    void this.ledger.prepareTrialBalance().then(r => this.rows.set(r));
  }

  protected money(n: number): string {
    return this.ledger.formatMoney(n);
  }

  protected totalDebit(): number {
    return this.rows().reduce((s, r) => s + r.debit, 0);
  }

  protected totalCredit(): number {
    return this.rows().reduce((s, r) => s + r.credit, 0);
  }
}
