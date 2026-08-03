import { Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@epikodelabs/switchboard';
import { DataInput, ParamsInput } from './route-inputs';

@Component({
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Analysis</p>
          <h1 class="scene-title">Spending — {{ accountName() }}</h1>
          <p class="scene-copy">
            Category breakdown of where money is going this cycle.
          </p>
        </div>
        <span class="status-chip">{{ categories().length }} categories</span>
      </header>

      <div class="panel">
        <h3>By Category</h3>
        <div class="spending-list">
          @for (cat of categories(); track cat.category) {
            <div class="spending-row">
              <span class="spending-row__name">{{ cat.category }}</span>
              <div class="spending-row__bar-wrap">
                <div class="spending-row__bar" [style.width.%]="percent(cat.total)"></div>
              </div>
              <strong class="spending-row__amount">{{ cat.total | currency }}</strong>
            </div>
          }
        </div>
      </div>

      <div class="action-row">
        <a class="action-link" [routerLink]="'/'">Back to dashboard</a>
        <a
          class="action-link action-link--accent"
          [routerLink]="{ name: 'account', params: { accountId: params()['accountId'] } }"
        >
          View ledger
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
      font-size: 0.8rem;
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
    .spending-list { display: grid; gap: 0.55rem; }
    .spending-row {
      display: grid;
      grid-template-columns: 7rem 1fr auto;
      align-items: center;
      gap: 0.7rem;
      padding: 0.5rem 0.6rem;
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.5);
    }
    .spending-row__name {
      font-size: 0.88rem;
      color: var(--ink-body);
      font-weight: 500;
    }
    .spending-row__bar-wrap {
      height: 0.5rem;
      background: rgba(180,160,130,0.2);
      border-radius: 0.25rem;
      overflow: hidden;
    }
    .spending-row__bar {
      height: 100%;
      background: linear-gradient(90deg, var(--debit-red), #c24a3d);
      border-radius: 0.25rem;
      transition: width 400ms ease;
    }
    .spending-row__amount {
      font-family: var(--font-mono);
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--debit-red);
      font-variant-numeric: tabular-nums;
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
    @media (max-width: 760px) {
      .scene-header { flex-direction: column; }
      .spending-row { grid-template-columns: 1fr; gap: 0.3rem; }
    }
  `,
})
export class SpendingPage {
  protected readonly params = input<ParamsInput>({});
  protected readonly data = input<DataInput>({});

  protected categories(): { category: string; total: number }[] {
    return (this.data()['categories'] as any[] | undefined) ?? [];
  }

  protected accountName(): string {
    return (this.data()['accountName'] as string | undefined) ?? '';
  }

  protected percent(total: number): number {
    const max = Math.max(...this.categories().map(c => c.total), 1);
    return (total / max) * 100;
  }
}
