import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@epikodelabs/switchboard';
import {
  Account,
  AccountType,
  JournalEntry,
  LedgerService,
} from '../services/ledger.service';
import { sceneStyles } from './scene-styles';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">General ledger</p>
          <h1 class="scene-title">Books · {{ ledger.periodLabel() }}</h1>
          <p class="scene-copy">
            Chart of accounts, drafts, and recent postings. Everything is editable and persisted locally.
          </p>
        </div>
        <div class="action-row">
          <a class="action-link action-link--accent" [routerLink]="{ name: 'journal' }">New journal entry</a>
          <a class="action-link" [routerLink]="{ name: 'trial' }">Trial balance</a>
        </div>
      </header>

      <div class="metric-strip">
        <article class="metric">
          <span>Cash</span>
          <strong>{{ money(snapshot()?.cashBalance ?? 0) }}</strong>
        </article>
        <article class="metric">
          <span>Assets</span>
          <strong>{{ money(totals().asset) }}</strong>
        </article>
        <article class="metric">
          <span>Liabilities</span>
          <strong>{{ money(totals().liability) }}</strong>
        </article>
        <article class="metric">
          <span>Open drafts</span>
          <strong>{{ (snapshot()?.drafts ?? []).length }}</strong>
        </article>
      </div>

      <div class="filter-bar">
        <input
          type="search"
          placeholder="Search accounts…"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
        @for (t of accountTypes; track t) {
          <button
            type="button"
            class="chip-toggle"
            [class.chip-toggle--active]="typeFilter() === t"
            (click)="toggleType(t)"
          >
            {{ t }}
          </button>
        }
        <button type="button" class="chip-toggle" [class.chip-toggle--active]="typeFilter() === 'all'" (click)="typeFilter.set('all')">
          all
        </button>
      </div>

      <div class="panel-grid">
        <article class="panel" style="grid-column: 1 / -1;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <h3 style="margin:0;">Chart of accounts</h3>
            <button type="button" class="action-button" (click)="showCreate.set(!showCreate())">
              {{ showCreate() ? 'Cancel' : 'Add account' }}
            </button>
          </div>

          @if (showCreate()) {
            <div class="form-grid" style="margin-bottom:0.85rem;padding:0.75rem;border:1px solid var(--line-soft);border-radius:0.35rem;">
              <div class="form-row">
                <div class="field">
                  <label>Code</label>
                  <input [(ngModel)]="newCode" placeholder="e.g. 1400" />
                </div>
                <div class="field">
                  <label>Name</label>
                  <input [(ngModel)]="newName" placeholder="Account name" />
                </div>
                <div class="field">
                  <label>Type</label>
                  <select [(ngModel)]="newType">
                    @for (t of accountTypes; track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="action-row">
                <button type="button" class="action-button action-button--accent" (click)="createAccount()">Create account</button>
              </div>
            </div>
          }

          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th class="num">Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (a of filteredAccounts(); track a.id) {
                <tr>
                  <td>{{ a.code }}</td>
                  <td>{{ a.name }}</td>
                  <td>{{ a.type }}</td>
                  <td class="num">{{ money(ledger.accountBalance(a.id)) }}</td>
                  <td>
                    <a [routerLink]="{ name: 'account', params: { accountId: a.id } }">Open</a>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty-state">No accounts match the filter.</td></tr>
              }
            </tbody>
          </table>
        </article>

        <article class="panel">
          <h3>Draft entries</h3>
          @if ((snapshot()?.drafts ?? []).length === 0) {
            <p class="empty-state">No drafts. Create a journal entry to start.</p>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (e of snapshot()?.drafts ?? []; track e.id) {
                  <tr>
                    <td>{{ e.reference }}</td>
                    <td>{{ e.description }}</td>
                    <td>
                      <a [routerLink]="{ name: 'journal', query: { entryId: e.id } }">Edit</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </article>

        <article class="panel">
          <h3>Recent activity</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (e of snapshot()?.recent ?? []; track e.id) {
                <tr>
                  <td>{{ e.date }}</td>
                  <td>
                    <a [routerLink]="{ name: 'entry', params: { entryId: e.id } }">{{ e.description }}</a>
                  </td>
                  <td><span class="badge" [class]="'badge--' + e.status">{{ e.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </article>
      </div>

      <div class="action-row">
        <button type="button" class="action-button" (click)="resetBooks()">Reset demo data</button>
        <a class="action-link" [routerLink]="{ name: 'settings' }">Settings</a>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class BooksPage {
  protected readonly ledger = inject(LedgerService);
  private readonly router = inject(Router);

  protected readonly search = signal('');
  protected readonly typeFilter = signal<AccountType | 'all'>('all');
  protected readonly showCreate = signal(false);
  protected newCode = '';
  protected newName = '';
  protected newType: AccountType = 'asset';
  protected readonly accountTypes: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];

  /** Bound from prepare data when present; falls back to live service. */
  protected readonly snapshot = signal<{
    accounts: Account[];
    recent: JournalEntry[];
    drafts: JournalEntry[];
    totals: Record<AccountType, number>;
    cashBalance: number;
  } | null>(null);

  constructor() {
    void this.ledger.prepareBooks().then(data => this.snapshot.set(data));
  }

  protected totals() {
    return this.snapshot()?.totals ?? this.ledger.totalsByType();
  }

  protected filteredAccounts = computed(() => {
    const q = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    return this.ledger.activeAccounts().filter(a => {
      if (type !== 'all' && a.type !== type) return false;
      if (!q) return true;
      return a.code.includes(q) || a.name.toLowerCase().includes(q);
    });
  });

  protected toggleType(t: AccountType): void {
    this.typeFilter.update(cur => (cur === t ? 'all' : t));
  }

  protected money(n: number): string {
    return this.ledger.formatMoney(n);
  }

  protected createAccount(): void {
    if (!this.newCode.trim() || !this.newName.trim()) return;
    const account = this.ledger.createAccount({
      code: this.newCode,
      name: this.newName,
      type: this.newType,
    });
    this.newCode = '';
    this.newName = '';
    this.showCreate.set(false);
    void this.router.navigate({ frame: 'account', params: { accountId: account.id } });
  }

  protected resetBooks(): void {
    if (confirm('Reset all ledger data to the demo seed?')) {
      this.ledger.resetToSeed();
      void this.ledger.prepareBooks().then(data => this.snapshot.set(data));
    }
  }
}
