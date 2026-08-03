import { Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@epikodelabs/switchboard';
import { DataInput } from './route-inputs';
import { TransferResult } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Receipt</p>
          <h1 class="scene-title">Transfer Confirmed</h1>
          <p class="scene-copy">
            This frame only renders after a successful transfer. Direct entry is blocked.
          </p>
        </div>
        <span class="status-chip">Guarded</span>
      </header>

      <div class="receipt">
        <div class="stamp">POSTED</div>
        <div class="receipt__grid">
          <article class="receipt__field">
            <span>Reference</span>
            <strong>{{ result()?.reference }}</strong>
          </article>
          <article class="receipt__field">
            <span>Date</span>
            <strong>{{ result()?.timestamp | date:'medium' }}</strong>
          </article>
          <article class="receipt__field">
            <span>From</span>
            <strong>{{ result()?.fromAccount!.name }}</strong>
            <small>{{ result()?.fromAccount!.balance | currency }}</small>
          </article>
          <article class="receipt__field">
            <span>To</span>
            <strong>{{ result()?.toAccount!.name }}</strong>
            <small>{{ result()?.toAccount!.balance | currency }}</small>
          </article>
          <article class="receipt__field receipt__field--wide">
            <span>Amount</span>
            <strong class="credit">{{ result()?.amount | currency }}</strong>
          </article>
          <article class="receipt__field receipt__field--wide">
            <span>Note</span>
            <strong>{{ result()?.note || '—' }}</strong>
          </article>
        </div>
      </div>

      <div class="action-row">
        <a class="action-link action-link--accent" [routerLink]="'/'">Back to dashboard</a>
        <a
          class="action-link"
          [routerLink]="{ name: 'account', params: { accountId: result()?.fromAccount!.id } }"
        >
          View source account
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
      min-width: 6rem;
      padding: 0.45rem 0.65rem;
      border: 1px solid var(--line-soft);
      border-left: 2px solid var(--line-strong);
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.8);
      color: var(--ink-strong);
      font-size: 0.78rem;
      font-weight: 600;
      text-align: center;
    }
    .receipt {
      position: relative;
      padding: 1.2rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background: rgba(255,255,255,0.8);
      overflow: hidden;
    }
    .stamp {
      position: absolute;
      top: 1.2rem;
      right: 1.6rem;
      padding: 0.35rem 0.7rem;
      border: 2px solid var(--credit-green);
      border-radius: 0.25rem;
      color: var(--credit-green);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      transform: rotate(-12deg);
      opacity: 0.85;
      pointer-events: none;
    }
    .receipt__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7rem;
      max-width: 32rem;
    }
    .receipt__field {
      display: grid;
      gap: 0.15rem;
      padding: 0.6rem 0.7rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.6);
    }
    .receipt__field--wide { grid-column: 1 / -1; }
    .receipt__field span {
      color: var(--ink-soft);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .receipt__field strong {
      color: var(--ink-strong);
      font-family: var(--font-mono);
      font-size: 0.95rem;
      font-weight: 600;
    }
    .receipt__field small {
      color: var(--ink-soft);
      font-size: 0.82rem;
      font-family: var(--font-mono);
    }
    .credit { color: var(--credit-green); }
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
    @media (max-width: 760px) {
      .scene-header { flex-direction: column; }
      .receipt__grid { grid-template-columns: 1fr; }
    }
  `,
})
export class ConfirmationPage {
  protected readonly data = input<DataInput>({});

  protected result(): TransferResult | null {
    return (this.data()['result'] as TransferResult | undefined) ?? null;
  }
}
