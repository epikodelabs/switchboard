import { Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@epikodelabs/switchboard';
import { DataInput, ParamsInput } from './route-inputs';
import { Account, LedgerLine } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Account Ledger</p>
          <h1 class="scene-title">{{ account()?.name }}</h1>
          <p class="scene-copy">
            Running balance history with tabular figures. Green ink for credits, brick-red for debits.
          </p>
        </div>
        <span class="status-chip" [class.credit]="account()!.balance >= 0" [class.debit]="account()!.balance < 0">
          {{ account()?.balance | currency }}
        </span>
      </header>

      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th class="num">Amount</th>
              <th class="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            @for (line of ledger(); track line.tx.id) {
              <tr>
                <td>{{ line.tx.date | date:'mediumDate' }}</td>
                <td>{{ line.tx.description }}</td>
                <td><span class="category-pill">{{ line.tx.category }}</span></td>
                <td class="num" [class.credit]="line.tx.amount >= 0" [class.debit]="line.tx.amount < 0">
                  {{ line.tx.amount | currency }}
                </td>
                <td class="num">{{ line.balance | currency }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="action-row">
        <a class="action-link" [routerLink]="'/'">Back to dashboard</a>
        <a
          class="action-link action-link--accent"
          [routerLink]="{ name: 'spending', params: { accountId: account()?.id } }"
        >
          View spending
        </a>
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
      min-width: 7rem;
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--line-soft);
      border-left: 2px solid var(--line-strong);
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.8);
      font-family: var(--font-mono);
      font-size: 0.9rem;
      font-weight: 700;
      text-align: center;
    }
    .ledger-table-wrap { overflow: auto; }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .ledger-table thead th {
      text-align: left;
      padding: 0.6rem 0.7rem;
      border-bottom: 2px solid var(--line-strong);
      color: var(--ink-soft);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .ledger-table thead th.num { text-align: right; font-family: var(--font-mono); }
    .ledger-table tbody td {
      padding: 0.6rem 0.7rem;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-body);
    }
    .ledger-table tbody td.num {
      text-align: right;
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .category-pill {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.2rem;
      background: rgba(180,160,130,0.15);
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--ink-soft);
    }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.4rem;
    }
    .action-link, .action-button {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 2.2rem; padding: 0.5rem 0.8rem;
      border: 1px solid var(--line-strong); border-radius: 0.28rem;
      background: rgba(255,255,255,0.88); color: var(--ink-strong);
      font-weight: 600; text-decoration: none; cursor: pointer;
      transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
    }
    .action-link--accent, .action-button--accent {
      border-color: var(--credit-green); background: var(--credit-green); color: #fff;
    }
    .action-link:hover, .action-button:hover { border-color: var(--credit-green); color: var(--credit-green); }
    .action-link--accent:hover, .action-button--accent:hover { background: #245c44; color: #fff; }
    .credit { color: var(--credit-green); }
    .debit { color: var(--debit-red); }
    @media (max-width: 760px) {
      .scene-header { flex-direction: column; }
      .ledger-table { min-width: 36rem; }
    }
  `,
})
export class AccountPage {
  protected readonly params = input<ParamsInput>({});
  protected readonly data = input<DataInput>({});

  protected account(): Account | undefined {
    return this.data()['account'] as Account | undefined;
  }

  protected ledger(): LedgerLine[] {
    return (this.data()['ledger'] as LedgerLine[] | undefined) ?? [];
  }
}
