import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterOutlet } from '@epikodelabs/switchboard';
import { LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterOutlet, CurrencyPipe],
  template: `
    <section class="ledger-layout" [class.ledger-layout--transitioning]="isTransitioning()">
      <aside class="ledger-layout__rail">
        <div class="ledger-layout__card">
          <p class="ledger-layout__label">Accounts</p>
          <div class="ledger-layout__accounts">
            @for (account of ledger.accounts(); track account.id) {
              <div class="ledger-layout__account-row">
                <span>{{ account.name }}</span>
                <strong [class.credit]="account.balance >= 0" [class.debit]="account.balance < 0">
                  {{ account.balance | currency }}
                </strong>
              </div>
            }
          </div>
        </div>

        <div class="ledger-layout__card">
          <p class="ledger-layout__label">Net Position</p>
          <strong class="ledger-layout__total" [class.credit]="totalBalance() >= 0" [class.debit]="totalBalance() < 0">
            {{ totalBalance() | currency }}
          </strong>
        </div>

        <section class="ledger-layout__outlet">
          <p class="ledger-layout__label">Companion</p>
          <router-outlet name="sidebar" />
        </section>
      </aside>

      <main class="ledger-layout__stage">
        <div class="ledger-layout__content">
          <router-outlet />
        </div>
      </main>
    </section>
  `,
  styles: `
    .ledger-layout {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
      gap: 0.75rem;
      max-width: 92rem;
      margin: 0 auto;
      min-height: calc(100vh - 7rem);
    }

    .ledger-layout__rail,
    .ledger-layout__stage {
      min-width: 0;
      padding: 0.75rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.4rem;
      background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(250,248,242,0.9));
      box-shadow: var(--stage-shadow);
    }

    .ledger-layout__rail {
      display: grid;
      align-content: start;
      gap: 0.65rem;
    }

    .ledger-layout__stage {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      transition: box-shadow 220ms ease, transform 220ms ease;
    }

    .ledger-layout--transitioning .ledger-layout__stage {
      transform: translateY(-1px);
      box-shadow: var(--stage-shadow), 0 0 0 1px rgba(45,106,79,0.08);
    }

    .ledger-layout__content {
      position: relative;
      z-index: 1;
      transition: transform 220ms ease, opacity 220ms ease;
    }

    .ledger-layout--transitioning .ledger-layout__content {
      transform: scale(0.996);
      opacity: 0.92;
    }

    .ledger-layout__card,
    .ledger-layout__outlet {
      padding: 0.75rem;
      border: 1px solid var(--line-soft);
      border-radius: 0.3rem;
      background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(245,241,232,0.9));
    }

    .ledger-layout__label {
      margin: 0 0 0.4rem;
      color: var(--ink-soft);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .ledger-layout__accounts {
      display: grid;
      gap: 0.4rem;
    }

    .ledger-layout__account-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      padding: 0.5rem 0.6rem;
      border-radius: 0.25rem;
      background: rgba(255,255,255,0.6);
      font-size: 0.88rem;
    }

    .ledger-layout__account-row span {
      color: var(--ink-body);
    }

    .ledger-layout__account-row strong {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .ledger-layout__total {
      display: block;
      font-family: var(--font-mono);
      font-size: 1.3rem;
      font-weight: 700;
      margin-top: 0.2rem;
    }

    .credit { color: var(--credit-green); }
    .debit { color: var(--debit-red); }

    @media (max-width: 960px) {
      .ledger-layout { grid-template-columns: 1fr; min-height: auto; }
    }
  `,
})
export class ShellPage {
  private readonly router = inject(Router);
  protected readonly ledger = inject(LedgerService);

  protected isTransitioning(): boolean {
    return this.router.state.pending;
  }

  protected totalBalance(): number {
    return this.ledger.accounts().reduce((sum, a) => sum + a.balance, 0);
  }
}
