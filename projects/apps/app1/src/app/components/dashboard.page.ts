import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@epikodelabs/switchboard';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Overview</p>
          <h1 class="scene-title">Dashboard</h1>
          <p class="scene-copy">
            Total balance across all accounts, recent activity, and quick actions.
          </p>
        </div>
        <span class="status-chip">{{ ledger.accounts().length }} accounts</span>
      </header>

      <div class="metric-strip">
        <article class="metric metric--wide">
          <span>Total Balance</span>
          <strong [class.credit]="totalBalance() >= 0" [class.debit]="totalBalance() < 0">
            {{ totalBalance() | currency }}
          </strong>
        </article>
      </div>

      <div class="panel-grid">
        <article class="panel">
          <h3>Accounts</h3>
          <div class="account-list">
            @for (account of ledger.accounts(); track account.id) {
              <button
                type="button"
                class="account-row"
                (click)="openAccount(account.id)"
              >
                <div class="account-row__meta">
                  <strong>{{ account.name }}</strong>
                  <span>{{ account.type }}</span>
                </div>
                <span class="account-row__amount" [class.credit]="account.balance >= 0" [class.debit]="account.balance < 0">
                  {{ account.balance | currency }}
                </span>
              </button>
            }
          </div>
          <div class="action-row" style="margin-top: 0.6rem;">
            <button type="button" class="action-button action-button--accent" (click)="openTransfer()">
              New Transfer
            </button>
          </div>
        </article>

        <article class="panel">
          <h3>Recent Activity</h3>
          <ul class="activity-list">
            @for (item of recentActivity(); track item.tx.id) {
              <li>
                <span class="activity-list__date">{{ item.tx.date | date:'shortDate' }}</span>
                <span class="activity-list__desc">{{ item.tx.description }}</span>
                <span class="activity-list__acct">{{ item.accountName }}</span>
                <strong [class.credit]="item.tx.amount >= 0" [class.debit]="item.tx.amount < 0">
                  {{ item.tx.amount | currency }}
                </strong>
              </li>
            }
          </ul>
        </article>
      </div>
    </section>
  `,
  styles: `
    .scene {
      position: relative;
      display: grid;
      gap: 0.8rem;
      padding: clamp(0.85rem, 1.4vw, 1.1rem);
      border: 1px solid var(--line-soft);
      border-radius: 0.4rem;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,248,242,0.96));
      box-shadow: var(--stage-shadow);
    }
    .scene-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .scene-eyebrow {
      margin: 0 0 0.4rem;
      color: var(--credit-green);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .scene-title {
      margin: 0;
      color: var(--ink-strong);
      font-size: clamp(1.4rem, 2vw, 2rem);
      line-height: 1.05;
    }
    .scene-copy {
      max-width: 44rem;
      margin: 0.35rem 0 0;
      font-size: 0.92rem;
      line-height: 1.55;
      color: var(--ink-soft);
    }
    .status-chip {
      min-width: 6rem;
      padding: 0.45rem 0.65rem;
      border: 1px solid var(--line-soft);
      border-left: 2px solid var(--line-strong);
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.8);
      color: var(--ink-strong);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
    }
    .metric-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: 0.6rem;
    }
    .metric {
      padding: 0.7rem 0.8rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.3rem;
      background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(245,241,232,0.86));
    }
    .metric--wide { grid-column: 1 / -1; }
    .metric span {
      display: block;
      color: var(--ink-soft);
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      margin-top: 0.25rem;
      font-family: var(--font-mono);
      font-size: 1.4rem;
      font-weight: 700;
    }
    .panel-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7rem;
    }
    .panel {
      padding: 0.8rem 0.9rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background: rgba(255,255,255,0.7);
    }
    .panel h3 {
      margin: 0 0 0.55rem;
      color: var(--ink-strong);
      font-size: 0.92rem;
      font-weight: 600;
    }
    .account-list { display: grid; gap: 0.4rem; }
    .account-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.7rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.3rem;
      background: rgba(255,255,255,0.6);
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: border-color 160ms ease, transform 80ms ease;
    }
    .account-row:hover { border-color: var(--line-strong); transform: translateY(-1px); }
    .account-row:active { transform: translateY(0); }
    .account-row__meta strong { display: block; font-size: 0.9rem; color: var(--ink-strong); }
    .account-row__meta span { display: block; font-size: 0.78rem; color: var(--ink-soft); text-transform: capitalize; margin-top: 0.1rem; }
    .account-row__amount { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; }
    .activity-list { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
    .activity-list li {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.65rem;
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.5);
      font-size: 0.88rem;
    }
    .activity-list__date { color: var(--ink-soft); font-size: 0.78rem; font-family: var(--font-mono); }
    .activity-list__desc { color: var(--ink-body); }
    .activity-list__acct { color: var(--ink-soft); font-size: 0.78rem; }
    .action-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .action-button {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 2.2rem; padding: 0.5rem 0.8rem;
      border: 1px solid var(--line-strong); border-radius: 0.28rem;
      background: rgba(255,255,255,0.88); color: var(--ink-strong);
      font-weight: 600; cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease;
    }
    .action-button--accent { border-color: var(--credit-green); background: var(--credit-green); color: #fff; }
    .action-button:hover { border-color: var(--credit-green); color: var(--credit-green); }
    .action-button--accent:hover { background: #245c44; color: #fff; }
    .credit { color: var(--credit-green); }
    .debit { color: var(--debit-red); }
    @media (max-width: 760px) {
      .scene-header { flex-direction: column; }
      .panel-grid { grid-template-columns: 1fr; }
      .activity-list li { grid-template-columns: 1fr; gap: 0.2rem; }
    }
  `,
})
export class DashboardPage {
  private readonly router = inject(Router);
  protected readonly ledger = inject(LedgerService);

  protected totalBalance(): number {
    return this.ledger.accounts().reduce((sum, a) => sum + a.balance, 0);
  }

  protected recentActivity() {
    const all: { accountName: string; tx: import('../services/ledger.service').Transaction }[] = [];
    for (const account of this.ledger.accounts()) {
      for (const tx of this.ledger.getTransactions(account.id)) {
        all.push({ accountName: account.name, tx });
      }
    }
    return all
      .sort((a, b) => new Date(b.tx.date).getTime() - new Date(a.tx.date).getTime())
      .slice(0, 5);
  }

  protected openAccount(accountId: number): void {
    void this.router.navigate({ name: 'account', params: { accountId } });
  }

  protected openTransfer(): void {
    void this.router.navigate({ frame: 'transfer' });
  }
}
