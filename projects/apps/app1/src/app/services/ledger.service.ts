import { Injectable, computed, signal } from '@angular/core';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type EntryStatus = 'draft' | 'posted' | 'voided';

export interface Account {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: string;
  readonly archived: boolean;
}

export interface JournalLine {
  readonly accountId: string;
  readonly debit: number;
  readonly credit: number;
  readonly memo?: string;
}

export interface JournalEntry {
  readonly id: string;
  readonly date: string; // YYYY-MM-DD
  readonly description: string;
  readonly reference: string;
  readonly status: EntryStatus;
  readonly lines: readonly JournalLine[];
  readonly createdAt: string;
  readonly postedAt?: string;
  readonly voidedAt?: string;
  readonly voidReason?: string;
}

export interface LedgerLine {
  readonly entryId: string;
  readonly date: string;
  readonly description: string;
  readonly reference: string;
  readonly debit: number;
  readonly credit: number;
  readonly balance: number;
  readonly status: EntryStatus;
}

export interface TrialBalanceRow {
  readonly accountId: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  readonly debit: number;
  readonly credit: number;
  readonly balance: number;
}

export interface ActivityEvent {
  readonly id: string;
  readonly at: string;
  readonly message: string;
  readonly kind: 'info' | 'post' | 'void' | 'create' | 'edit';
}

const STORAGE_KEY = 'switchboard-ledger-v1';

const seedAccounts: Account[] = [
  { id: 'a-1000', code: '1000', name: 'Cash', type: 'asset', currency: 'USD', archived: false },
  { id: 'a-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', currency: 'USD', archived: false },
  { id: 'a-1200', code: '1200', name: 'Inventory', type: 'asset', currency: 'USD', archived: false },
  { id: 'a-2000', code: '2000', name: 'Accounts Payable', type: 'liability', currency: 'USD', archived: false },
  { id: 'a-2100', code: '2100', name: 'Accrued Expenses', type: 'liability', currency: 'USD', archived: false },
  { id: 'a-3000', code: '3000', name: 'Owner Equity', type: 'equity', currency: 'USD', archived: false },
  { id: 'a-4000', code: '4000', name: 'Sales Revenue', type: 'income', currency: 'USD', archived: false },
  { id: 'a-4100', code: '4100', name: 'Service Revenue', type: 'income', currency: 'USD', archived: false },
  { id: 'a-5000', code: '5000', name: 'Cost of Goods Sold', type: 'expense', currency: 'USD', archived: false },
  { id: 'a-5100', code: '5100', name: 'Rent Expense', type: 'expense', currency: 'USD', archived: false },
  { id: 'a-5200', code: '5200', name: 'Utilities', type: 'expense', currency: 'USD', archived: false },
  { id: 'a-5300', code: '5300', name: 'Salaries', type: 'expense', currency: 'USD', archived: false },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoNow(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const seedEntries: JournalEntry[] = [
  {
    id: 'je-001',
    date: '2026-07-01',
    description: 'Opening capital contribution',
    reference: 'OPEN-001',
    status: 'posted',
    createdAt: '2026-07-01T09:00:00.000Z',
    postedAt: '2026-07-01T09:00:00.000Z',
    lines: [
      { accountId: 'a-1000', debit: 50000, credit: 0, memo: 'Initial cash' },
      { accountId: 'a-3000', debit: 0, credit: 50000, memo: 'Owner equity' },
    ],
  },
  {
    id: 'je-002',
    date: '2026-07-03',
    description: 'Office rent — July',
    reference: 'RENT-0701',
    status: 'posted',
    createdAt: '2026-07-03T11:20:00.000Z',
    postedAt: '2026-07-03T11:20:00.000Z',
    lines: [
      { accountId: 'a-5100', debit: 2400, credit: 0 },
      { accountId: 'a-1000', debit: 0, credit: 2400 },
    ],
  },
  {
    id: 'je-003',
    date: '2026-07-05',
    description: 'Invoice #1042 — consulting services',
    reference: 'INV-1042',
    status: 'posted',
    createdAt: '2026-07-05T14:10:00.000Z',
    postedAt: '2026-07-05T14:10:00.000Z',
    lines: [
      { accountId: 'a-1100', debit: 8500, credit: 0 },
      { accountId: 'a-4100', debit: 0, credit: 8500 },
    ],
  },
  {
    id: 'je-004',
    date: '2026-07-08',
    description: 'Inventory purchase — supplier Apex',
    reference: 'PO-331',
    status: 'posted',
    createdAt: '2026-07-08T10:00:00.000Z',
    postedAt: '2026-07-08T10:00:00.000Z',
    lines: [
      { accountId: 'a-1200', debit: 12000, credit: 0 },
      { accountId: 'a-2000', debit: 0, credit: 12000 },
    ],
  },
  {
    id: 'je-005',
    date: '2026-07-12',
    description: 'Customer payment — INV-1042',
    reference: 'RCPT-882',
    status: 'posted',
    createdAt: '2026-07-12T16:40:00.000Z',
    postedAt: '2026-07-12T16:40:00.000Z',
    lines: [
      { accountId: 'a-1000', debit: 8500, credit: 0 },
      { accountId: 'a-1100', debit: 0, credit: 8500 },
    ],
  },
  {
    id: 'je-006',
    date: '2026-07-15',
    description: 'Payroll — mid-month',
    reference: 'PAY-0715',
    status: 'posted',
    createdAt: '2026-07-15T09:30:00.000Z',
    postedAt: '2026-07-15T09:30:00.000Z',
    lines: [
      { accountId: 'a-5300', debit: 6200, credit: 0 },
      { accountId: 'a-1000', debit: 0, credit: 6200 },
    ],
  },
  {
    id: 'je-007',
    date: '2026-07-18',
    description: 'Product sale — cash register',
    reference: 'SALE-441',
    status: 'posted',
    createdAt: '2026-07-18T18:00:00.000Z',
    postedAt: '2026-07-18T18:00:00.000Z',
    lines: [
      { accountId: 'a-1000', debit: 3200, credit: 0 },
      { accountId: 'a-4000', debit: 0, credit: 3200 },
      { accountId: 'a-5000', debit: 1800, credit: 0 },
      { accountId: 'a-1200', debit: 0, credit: 1800 },
    ],
  },
  {
    id: 'je-008',
    date: '2026-07-22',
    description: 'Utilities — June settlement',
    reference: 'UTIL-062',
    status: 'posted',
    createdAt: '2026-07-22T12:00:00.000Z',
    postedAt: '2026-07-22T12:00:00.000Z',
    lines: [
      { accountId: 'a-5200', debit: 380, credit: 0 },
      { accountId: 'a-1000', debit: 0, credit: 380 },
    ],
  },
  {
    id: 'je-009',
    date: '2026-07-28',
    description: 'Draft: supplier credit note (unposted)',
    reference: 'CN-019',
    status: 'draft',
    createdAt: '2026-07-28T15:00:00.000Z',
    lines: [
      { accountId: 'a-2000', debit: 450, credit: 0 },
      { accountId: 'a-1200', debit: 0, credit: 450 },
    ],
  },
];

interface PersistedState {
  accounts: Account[];
  entries: JournalEntry[];
  events: ActivityEvent[];
  nextAccountSeq: number;
  nextEntrySeq: number;
}

@Injectable({ providedIn: 'root' })
export class LedgerService {
  readonly accounts = signal<Account[]>([]);
  readonly entries = signal<JournalEntry[]>([]);
  readonly events = signal<ActivityEvent[]>([]);
  readonly baseCurrency = signal('USD');
  readonly periodLabel = signal('July 2026');

  private nextAccountSeq = 1300;
  private nextEntrySeq = 10;

  readonly activeAccounts = computed(() =>
    this.accounts().filter(a => !a.archived).sort((a, b) => a.code.localeCompare(b.code)),
  );

  readonly draftEntries = computed(() =>
    this.entries().filter(e => e.status === 'draft'),
  );

  readonly postedEntries = computed(() =>
    this.entries()
      .filter(e => e.status === 'posted')
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  );

  readonly recentEntries = computed(() => this.entries().slice().sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  ).slice(0, 12));

  constructor() {
    this.hydrate();
  }

  // ── Persistence ──────────────────────────────────────────────

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as PersistedState;
        this.accounts.set(data.accounts);
        this.entries.set(data.entries);
        this.events.set(data.events ?? []);
        this.nextAccountSeq = data.nextAccountSeq ?? 1300;
        this.nextEntrySeq = data.nextEntrySeq ?? 10;
        return;
      }
    } catch {
      // fall through to seed
    }
    this.resetToSeed();
  }

  private persist(): void {
    const data: PersistedState = {
      accounts: this.accounts(),
      entries: this.entries(),
      events: this.events().slice(0, 40),
      nextAccountSeq: this.nextAccountSeq,
      nextEntrySeq: this.nextEntrySeq,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  resetToSeed(): void {
    this.accounts.set([...seedAccounts]);
    this.entries.set([...seedEntries]);
    this.events.set([
      {
        id: uid('ev'),
        at: isoNow(),
        message: 'Books seeded with opening balances and July activity.',
        kind: 'info',
      },
    ]);
    this.nextAccountSeq = 1300;
    this.nextEntrySeq = 10;
    this.persist();
  }

  private log(message: string, kind: ActivityEvent['kind'] = 'info'): void {
    this.events.update(list => [
      { id: uid('ev'), at: isoNow(), message, kind },
      ...list,
    ].slice(0, 40));
  }

  // ── Accounts ─────────────────────────────────────────────────

  getAccount(id: string): Account | undefined {
    return this.accounts().find(a => a.id === id);
  }

  createAccount(input: {
    code: string;
    name: string;
    type: AccountType;
  }): Account {
    const account: Account = {
      id: uid('a'),
      code: input.code.trim(),
      name: input.name.trim(),
      type: input.type,
      currency: this.baseCurrency(),
      archived: false,
    };
    this.accounts.update(list => [...list, account]);
    this.log(`Account ${account.code} ${account.name} created.`, 'create');
    this.persist();
    return account;
  }

  updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'code' | 'type' | 'archived'>>): void {
    this.accounts.update(list =>
      list.map(a => (a.id === id ? { ...a, ...patch } : a)),
    );
    this.log(`Account updated.`, 'edit');
    this.persist();
  }

  accountBalance(accountId: string): number {
    let bal = 0;
    const account = this.getAccount(accountId);
    if (!account) return 0;
    const normalDebit = account.type === 'asset' || account.type === 'expense';
    for (const entry of this.entries()) {
      if (entry.status !== 'posted') continue;
      for (const line of entry.lines) {
        if (line.accountId !== accountId) continue;
        if (normalDebit) {
          bal += line.debit - line.credit;
        } else {
          bal += line.credit - line.debit;
        }
      }
    }
    return bal;
  }

  ledgerLines(accountId: string): LedgerLine[] {
    const rows: LedgerLine[] = [];
    let running = 0;
    const account = this.getAccount(accountId);
    if (!account) return [];
    const normalDebit = account.type === 'asset' || account.type === 'expense';

    const sorted = this.entries()
      .filter(e => e.status === 'posted' || e.status === 'voided')
      .filter(e => e.lines.some(l => l.accountId === accountId))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    for (const entry of sorted) {
      for (const line of entry.lines) {
        if (line.accountId !== accountId) continue;
        if (entry.status === 'posted') {
          if (normalDebit) {
            running += line.debit - line.credit;
          } else {
            running += line.credit - line.debit;
          }
        }
        rows.push({
          entryId: entry.id,
          date: entry.date,
          description: entry.description,
          reference: entry.reference,
          debit: line.debit,
          credit: line.credit,
          balance: entry.status === 'posted' ? running : running,
          status: entry.status,
        });
      }
    }
    return rows;
  }

  // ── Journal entries ──────────────────────────────────────────

  getEntry(id: string): JournalEntry | undefined {
    return this.entries().find(e => e.id === id);
  }

  createDraft(input: {
    date: string;
    description: string;
    reference: string;
    lines: JournalLine[];
  }): JournalEntry {
    const entry: JournalEntry = {
      id: `je-${String(this.nextEntrySeq++).padStart(3, '0')}`,
      date: input.date || today(),
      description: input.description.trim(),
      reference: input.reference.trim() || `DRAFT-${this.nextEntrySeq}`,
      status: 'draft',
      lines: input.lines,
      createdAt: isoNow(),
    };
    this.entries.update(list => [entry, ...list]);
    this.log(`Draft ${entry.id} created: ${entry.description}`, 'create');
    this.persist();
    return entry;
  }

  updateDraft(id: string, input: {
    date: string;
    description: string;
    reference: string;
    lines: JournalLine[];
  }): JournalEntry | null {
    const existing = this.getEntry(id);
    if (!existing || existing.status !== 'draft') return null;
    const updated: JournalEntry = {
      ...existing,
      date: input.date,
      description: input.description.trim(),
      reference: input.reference.trim(),
      lines: input.lines,
    };
    this.entries.update(list => list.map(e => (e.id === id ? updated : e)));
    this.log(`Draft ${id} updated.`, 'edit');
    this.persist();
    return updated;
  }

  /** Returns null if unbalanced or already posted. */
  postEntry(id: string): JournalEntry | null {
    const entry = this.getEntry(id);
    if (!entry || entry.status !== 'draft') return null;
    if (!this.isBalanced(entry.lines)) return null;

    const posted: JournalEntry = {
      ...entry,
      status: 'posted',
      postedAt: isoNow(),
    };
    this.entries.update(list => list.map(e => (e.id === id ? posted : e)));
    this.log(`Posted ${id}: ${entry.description}`, 'post');
    this.persist();
    return posted;
  }

  voidEntry(id: string, reason: string): JournalEntry | null {
    const entry = this.getEntry(id);
    if (!entry || entry.status !== 'posted') return null;
    const voided: JournalEntry = {
      ...entry,
      status: 'voided',
      voidedAt: isoNow(),
      voidReason: reason.trim() || 'Voided by operator',
    };
    this.entries.update(list => list.map(e => (e.id === id ? voided : e)));
    this.log(`Voided ${id}: ${reason}`, 'void');
    this.persist();
    return voided;
  }

  deleteDraft(id: string): boolean {
    const entry = this.getEntry(id);
    if (!entry || entry.status !== 'draft') return false;
    this.entries.update(list => list.filter(e => e.id !== id));
    this.log(`Deleted draft ${id}.`, 'edit');
    this.persist();
    return true;
  }

  isBalanced(lines: readonly JournalLine[]): boolean {
    const debits = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const credits = lines.reduce((s, l) => s + (l.credit || 0), 0);
    return Math.abs(debits - credits) < 0.005 && debits > 0;
  }

  lineTotals(lines: readonly JournalLine[]): { debit: number; credit: number } {
    return {
      debit: lines.reduce((s, l) => s + (l.debit || 0), 0),
      credit: lines.reduce((s, l) => s + (l.credit || 0), 0),
    };
  }

  // ── Reports ──────────────────────────────────────────────────

  trialBalance(): TrialBalanceRow[] {
    return this.activeAccounts().map(account => {
      let debit = 0;
      let credit = 0;
      for (const entry of this.entries()) {
        if (entry.status !== 'posted') continue;
        for (const line of entry.lines) {
          if (line.accountId !== account.id) continue;
          debit += line.debit;
          credit += line.credit;
        }
      }
      const normalDebit = account.type === 'asset' || account.type === 'expense';
      const balance = normalDebit ? debit - credit : credit - debit;
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
        balance,
      };
    }).filter(r => r.debit !== 0 || r.credit !== 0);
  }

  totalsByType(): Record<AccountType, number> {
    const result: Record<AccountType, number> = {
      asset: 0,
      liability: 0,
      equity: 0,
      income: 0,
      expense: 0,
    };
    for (const row of this.trialBalance()) {
      result[row.type] += row.balance;
    }
    return result;
  }

  // ── Async prepare helpers (simulate network) ─────────────────

  async prepareBooks(): Promise<{
    accounts: Account[];
    recent: JournalEntry[];
    drafts: JournalEntry[];
    totals: Record<AccountType, number>;
    cashBalance: number;
  }> {
    await this.delay(180);
    return {
      accounts: this.activeAccounts(),
      recent: this.recentEntries(),
      drafts: this.draftEntries(),
      totals: this.totalsByType(),
      cashBalance: this.accountBalance('a-1000'),
    };
  }

  async prepareAccount(accountId: string): Promise<{
    account: Account | null;
    lines: LedgerLine[];
    balance: number;
  }> {
    await this.delay(220);
    const account = this.getAccount(accountId) ?? null;
    return {
      account,
      lines: account ? this.ledgerLines(accountId) : [],
      balance: account ? this.accountBalance(accountId) : 0,
    };
  }

  async prepareEntry(entryId: string): Promise<JournalEntry | null> {
    await this.delay(160);
    return this.getEntry(entryId) ?? null;
  }

  async prepareTrialBalance(): Promise<TrialBalanceRow[]> {
    await this.delay(240);
    return this.trialBalance();
  }

  async prepareJournalForm(entryId?: string): Promise<{
    entry: JournalEntry | null;
    accounts: Account[];
  }> {
    await this.delay(140);
    return {
      entry: entryId ? this.getEntry(entryId) ?? null : null,
      accounts: this.activeAccounts(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.baseCurrency(),
      minimumFractionDigits: 2,
    }).format(amount);
  }
}
