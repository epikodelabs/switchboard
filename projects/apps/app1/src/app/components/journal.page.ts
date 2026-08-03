import { Component, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@epikodelabs/switchboard';
import { DataInput, ParamsInput, QueryInput } from './route-inputs';
import { sceneStyles } from './scene-styles';
import {
  Account,
  JournalEntry,
  JournalLine,
  LedgerService,
} from '../services/ledger.service';

interface EditableLine {
  accountId: string;
  debit: number | null;
  credit: number | null;
  memo: string;
}

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="scene">
      <header class="scene-header">
        <div>
          <p class="scene-eyebrow">Journal voucher</p>
          <h1 class="scene-title">{{ editingId() ? 'Edit draft' : 'New journal entry' }}</h1>
          <p class="scene-copy">
            Debits must equal credits before posting. Save as draft anytime.
          </p>
        </div>
        <span class="status-chip" [class.status-chip--draft]="true">draft</span>
      </header>

      <div class="form-grid">
        <div class="form-row">
          <div class="field">
            <label>Date</label>
            <input type="date" [(ngModel)]="date" />
          </div>
          <div class="field">
            <label>Reference</label>
            <input [(ngModel)]="reference" placeholder="INV-1001" />
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <input [(ngModel)]="description" placeholder="What happened?" />
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Account</th>
            <th class="num">Debit</th>
            <th class="num">Credit</th>
            <th>Memo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (line of lines(); track $index; let i = $index) {
            <tr>
              <td>
                <select [(ngModel)]="line.accountId">
                  <option value="">— select —</option>
                  @for (a of accounts(); track a.id) {
                    <option [value]="a.id">{{ a.code }} {{ a.name }}</option>
                  }
                </select>
              </td>
              <td class="num">
                <input type="number" min="0" step="0.01" [(ngModel)]="line.debit" style="width:7rem;text-align:right;" />
              </td>
              <td class="num">
                <input type="number" min="0" step="0.01" [(ngModel)]="line.credit" style="width:7rem;text-align:right;" />
              </td>
              <td>
                <input [(ngModel)]="line.memo" placeholder="optional" style="width:100%;" />
              </td>
              <td>
                <button type="button" class="action-button" (click)="removeLine(i)" [disabled]="lines().length <= 2">×</button>
              </td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Totals</strong></td>
            <td class="num"><strong>{{ money(debitTotal()) }}</strong></td>
            <td class="num"><strong>{{ money(creditTotal()) }}</strong></td>
            <td colspan="2">
              @if (balanced()) {
                <span class="badge badge--posted">balanced</span>
              } @else {
                <span class="badge badge--draft">out of balance {{ money(Math.abs(debitTotal() - creditTotal())) }}</span>
              }
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="action-row">
        <button type="button" class="action-button" (click)="addLine()">Add line</button>
        <button type="button" class="action-button action-button--accent" (click)="saveDraft()">Save draft</button>
        <button type="button" class="action-button action-button--accent" (click)="saveAndPost()" [disabled]="!balanced()">
          Save & post
        </button>
        @if (editingId()) {
          <button type="button" class="action-button action-button--danger" (click)="deleteDraft()">Delete draft</button>
        }
        <a class="action-link" [routerLink]="{ name: 'books' }">Cancel</a>
      </div>
    </section>
  `,
  styles: [sceneStyles],
})
export class JournalPage {
  private readonly ledger = inject(LedgerService);
  private readonly router = inject(Router);

  protected readonly params = input<ParamsInput>({});
  protected readonly query = input<QueryInput>({});
  protected readonly data = input<DataInput>({});

  protected readonly accounts = signal<Account[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly lines = signal<EditableLine[]>([
    { accountId: '', debit: null, credit: null, memo: '' },
    { accountId: '', debit: null, credit: null, memo: '' },
  ]);

  protected date = new Date().toISOString().slice(0, 10);
  protected description = '';
  protected reference = '';
  protected readonly Math = Math;

  constructor() {
    effect(() => {
      const entryId = String(this.query()['entryId'] ?? '');
      const prefillAccount = String(this.query()['accountId'] ?? '');
      void this.ledger.prepareJournalForm(entryId || undefined).then(result => {
        this.accounts.set(result.accounts);
        if (result.entry && result.entry.status === 'draft') {
          this.editingId.set(result.entry.id);
          this.date = result.entry.date;
          this.description = result.entry.description;
          this.reference = result.entry.reference;
          this.lines.set(
            result.entry.lines.map(l => ({
              accountId: l.accountId,
              debit: l.debit || null,
              credit: l.credit || null,
              memo: l.memo ?? '',
            })),
          );
        } else if (prefillAccount) {
          this.lines.set([
            { accountId: prefillAccount, debit: null, credit: null, memo: '' },
            { accountId: '', debit: null, credit: null, memo: '' },
          ]);
        }
      });
    });
  }

  protected money(n: number): string {
    return this.ledger.formatMoney(n);
  }

  protected debitTotal(): number {
    return this.lines().reduce((s, l) => s + (Number(l.debit) || 0), 0);
  }

  protected creditTotal(): number {
    return this.lines().reduce((s, l) => s + (Number(l.credit) || 0), 0);
  }

  protected balanced(): boolean {
    const d = this.debitTotal();
    const c = this.creditTotal();
    return Math.abs(d - c) < 0.005 && d > 0;
  }

  protected addLine(): void {
    this.lines.update(list => [...list, { accountId: '', debit: null, credit: null, memo: '' }]);
  }

  protected removeLine(index: number): void {
    this.lines.update(list => list.filter((_, i) => i !== index));
  }

  private toJournalLines(): JournalLine[] {
    return this.lines()
      .filter(l => l.accountId && ((l.debit ?? 0) > 0 || (l.credit ?? 0) > 0))
      .map(l => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        memo: l.memo || undefined,
      }));
  }

  protected saveDraft(): void {
    const body = {
      date: this.date,
      description: this.description || 'Untitled entry',
      reference: this.reference,
      lines: this.toJournalLines(),
    };
    if (body.lines.length < 2) {
      alert('Add at least two lines with amounts.');
      return;
    }
    const id = this.editingId();
    const entry = id
      ? this.ledger.updateDraft(id, body)
      : this.ledger.createDraft(body);
    if (entry) {
      void this.router.navigate({ frame: 'entry', params: { entryId: entry.id } });
    }
  }

  protected saveAndPost(): void {
    if (!this.balanced()) return;
    const body = {
      date: this.date,
      description: this.description || 'Untitled entry',
      reference: this.reference,
      lines: this.toJournalLines(),
    };
    let entry = this.editingId()
      ? this.ledger.updateDraft(this.editingId()!, body)
      : this.ledger.createDraft(body);
    if (!entry) return;
    entry = this.ledger.postEntry(entry.id);
    if (entry) {
      void this.router.navigate({ frame: 'entry', params: { entryId: entry.id } });
    } else {
      alert('Could not post — check balance.');
    }
  }

  protected deleteDraft(): void {
    const id = this.editingId();
    if (!id) return;
    if (confirm('Delete this draft?')) {
      this.ledger.deleteDraft(id);
      void this.router.navigate({ frame: 'books' });
    }
  }
}
