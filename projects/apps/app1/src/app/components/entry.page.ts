import { Component, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@epikodelabs/switchboard';
import { DataInput, ParamsInput, QueryInput } from './route-inputs';
import { sceneStyles } from './scene-styles';
import { JournalEntry, LedgerService } from '../services/ledger.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Journal entry</p>
          <h1 class="scene-title">{{ entry()?.description ?? 'Entry' }}</h1>
          <p class="scene-copy">
            {{ entry()?.reference }} · {{ entry()?.date }}
          </p>
        </div>
        <span class="status-chip" [class]="'status-chip--' + (entry()?.status ?? 'draft')">
          {{ entry()?.status ?? '—' }}
        </span>
      </header>

      @if (!entry()) {
        <p class="empty-state">Entry not found.</p>
      } @else {
        <div class="metric-strip">
          <article class="metric">
            <span>Entry id</span>
            <strong>{{ entry()!.id }}</strong>
          </article>
          <article class="metric">
            <span>Debits</span>
            <strong>{{ money(totals().debit) }}</strong>
          </article>
          <article class="metric">
            <span>Credits</span>
            <strong>{{ money(totals().credit) }}</strong>
          </article>
          <article class="metric">
            <span>Created</span>
            <strong>{{ entry()!.createdAt.slice(0, 10) }}</strong>
          </article>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th class="num">Debit</th>
              <th class="num">Credit</th>
              <th>Memo</th>
            </tr>
          </thead>
          <tbody>
            @for (line of entry()!.lines; track $index) {
              <tr>
                <td>
                  <a [routerLink]="{ name: 'account', params: { accountId: line.accountId } }">
                    {{ accountLabel(line.accountId) }}
                  </a>
                </td>
                <td class="num">{{ line.debit ? money(line.debit) : '—' }}</td>
                <td class="num">{{ line.credit ? money(line.credit) : '—' }}</td>
                <td>{{ line.memo || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>

        @if (entry()!.status === 'voided') {
          <p class="scene-copy">Void reason: {{ entry()!.voidReason }}</p>
        }

        <div class="action-row">
          @if (entry()!.status === 'draft') {
            <a class="action-link action-link--accent" [routerLink]="{ name: 'journal', query: { entryId: entry()!.id } }">
              Edit draft
            </a>
            <button type="button" class="action-button action-button--accent" (click)="post()" [disabled]="!canPost()">
              Post entry
            </button>
            <button type="button" class="action-button action-button--danger" (click)="deleteDraft()">Delete</button>
          }
          @if (entry()!.status === 'posted') {
            <button type="button" class="action-button action-button--danger" (click)="showVoid.set(true)">Void entry</button>
          }
          <a class="action-link" [routerLink]="{ name: 'books' }">Back to books</a>
          <a class="action-link" [routerLink]="{ name: 'journal' }">New entry</a>
        </div>

        @if (showVoid()) {
          <div class="form-grid" style="margin-top:0.75rem;padding:0.85rem;border:1px solid var(--line-soft);border-radius:0.35rem;">
            <div class="field">
              <label>Void reason</label>
              <input [(ngModel)]="voidReason" placeholder="Why is this being voided?" />
            </div>
            <div class="action-row">
              <button type="button" class="action-button action-button--danger" (click)="confirmVoid()">Confirm void</button>
              <button type="button" class="action-button" (click)="showVoid.set(false)">Cancel</button>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: [sceneStyles],
})
export class EntryPage {
  private readonly ledger = inject(LedgerService);
  private readonly router = inject(Router);

  protected readonly params = input<ParamsInput>({});
  protected readonly query = input<QueryInput>({});
  protected readonly data = input<DataInput>({});

  protected readonly entry = signal<JournalEntry | null>(null);
  protected readonly showVoid = signal(false);
  protected voidReason = '';

  constructor() {
    effect(() => {
      const id = String(this.params()['entryId'] ?? '');
      if (!id) return;
      void this.ledger.prepareEntry(id).then(e => this.entry.set(e));
    });
  }

  protected money(n: number): string {
    return this.ledger.formatMoney(n);
  }

  protected totals() {
    const e = this.entry();
    if (!e) return { debit: 0, credit: 0 };
    return this.ledger.lineTotals(e.lines);
  }

  protected canPost(): boolean {
    const e = this.entry();
    return !!e && this.ledger.isBalanced(e.lines);
  }

  protected accountLabel(id: string): string {
    const a = this.ledger.getAccount(id);
    return a ? a.code + ' ' + a.name : id;
  }

  protected post(): void {
    const e = this.entry();
    if (!e) return;
    const posted = this.ledger.postEntry(e.id);
    if (posted) this.entry.set(posted);
    else alert('Cannot post unbalanced entry.');
  }

  protected deleteDraft(): void {
    const e = this.entry();
    if (!e) return;
    if (confirm('Delete draft ' + e.id + '?')) {
      this.ledger.deleteDraft(e.id);
      void this.router.navigate({ frame: 'books' });
    }
  }

  protected confirmVoid(): void {
    const e = this.entry();
    if (!e) return;
    const voided = this.ledger.voidEntry(e.id, this.voidReason);
    if (voided) {
      this.entry.set(voided);
      this.showVoid.set(false);
    }
  }
}
