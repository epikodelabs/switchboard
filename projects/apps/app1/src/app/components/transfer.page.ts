import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@epikodelabs/switchboard';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Internal frame</p>
          <h1 class="scene-title">Transfer</h1>
          <p class="scene-copy">
            Move money between your accounts. This frame has no public address — it is reached through the frame graph.
          </p>
        </div>
        <span class="status-chip">No direct entry</span>
      </header>

      <div class="panel">
        <h3>Transfer details</h3>
        <div class="form-grid">
          <label class="field">
            <span>From account</span>
            <select [ngModel]="fromId()" (change)="fromId.set(+($any($event).target.value))">
              @for (account of accounts(); track account.id) {
                <option [value]="account.id">{{ account.name }} — {{ account.balance | currency }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>To account</span>
            <select [ngModel]="toId()" (change)="toId.set(+($any($event).target.value))">
              @for (account of accounts(); track account.id) {
                <option [value]="account.id">{{ account.name }} — {{ account.balance | currency }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Amount</span>
            <input type="number" min="0.01" step="0.01" [value]="amount()" (input)="amount.set($any($event).target.value)" placeholder="0.00" />
          </label>

          <label class="field">
            <span>Note</span>
            <input type="text" [value]="note()" (input)="note.set($any($event).target.value)" placeholder="Optional note" />
          </label>
        </div>

        @if (error()) {
          <p class="form-error">{{ error() }}</p>
        }

        <div class="action-row" style="margin-top: 0.7rem;">
          <button type="button" class="action-button" (click)="cancel()">Cancel</button>
          <button
            type="button"
            class="action-button action-button--accent"
            [disabled]="!canSubmit()"
            (click)="submit()"
          >
            Post Transfer
          </button>
        </div>
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
    .panel {
      padding: 0.8rem 0.9rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.35rem;
      background: rgba(255,255,255,0.7);
    }
    .panel h3 {
      margin: 0 0 0.7rem;
      color: var(--ink-strong);
      font-size: 0.92rem;
      font-weight: 600;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7rem;
    }
    .field {
      display: grid;
      gap: 0.3rem;
    }
    .field span {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ink-soft);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .field input, .field select {
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.8);
      color: var(--ink-body);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 160ms ease;
    }
    .field input:focus, .field select:focus {
      border-color: var(--credit-green);
    }
    .form-error {
      margin: 0.5rem 0 0;
      color: var(--debit-red);
      font-size: 0.88rem;
      font-weight: 500;
    }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
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
    .action-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: var(--line-soft);
      color: var(--ink-soft);
    }
    @media (max-width: 760px) {
      .scene-header { flex-direction: column; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class TransferPage {
  private readonly router = inject(Router);
  private readonly ledger = inject(LedgerService);

  protected readonly fromId = signal<number>(1);
  protected readonly toId = signal<number>(2);
  protected readonly amount = signal<string>('');
  protected readonly note = signal<string>('');
  protected readonly error = signal<string>('');

  protected accounts() {
    return this.ledger.accounts();
  }

  protected canSubmit(): boolean {
    const amt = Number(this.amount());
    const from = this.ledger.getAccount(this.fromId());
    return amt > 0 && from !== undefined && from.balance >= amt && this.fromId() !== this.toId();
  }

  protected cancel(): void {
    void this.router.navigate({ frame: 'dashboard' });
  }

  protected async submit(): Promise<void> {
    const amt = Number(this.amount());
    if (!this.canSubmit()) {
      this.error.set('Invalid transfer: check amount and account balances.');
      return;
    }
    this.error.set('');
    const result = await this.ledger.transfer(this.fromId(), this.toId(), amt, this.note());
    void this.router.navigate(
      { frame: 'confirmation' },
      { state: result },
    );
  }
}
