import { Injectable, signal } from '@angular/core';

export interface Account {
  readonly id: number;
  readonly name: string;
  readonly type: 'checking' | 'savings' | 'credit';
  readonly balance: number;
}

export interface Transaction {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly category: string;
  readonly amount: number;
}

export interface LedgerLine {
  readonly tx: Transaction;
  readonly balance: number;
}

export interface TransferResult {
  readonly reference: string;
  readonly timestamp: string;
  readonly fromAccount: Account;
  readonly toAccount: Account;
  readonly amount: number;
  readonly note: string;
}

const ACCOUNTS: Account[] = [
  { id: 1, name: 'Primary Checking', type: 'checking', balance: 4820.55 },
  { id: 2, name: 'High-Yield Savings', type: 'savings', balance: 12750.00 },
  { id: 3, name: 'Credit Card', type: 'credit', balance: -1240.30 },
];

const TRANSACTIONS: Record<number, Transaction[]> = {
  1: [
    { id: 't1', date: '2026-08-01', description: 'Grocery Market', category: 'Food', amount: -124.50 },
    { id: 't2', date: '2026-08-01', description: 'Salary Deposit', category: 'Income', amount: 5200.00 },
    { id: 't3', date: '2026-07-30', description: 'Electric Bill', category: 'Utilities', amount: -85.20 },
    { id: 't4', date: '2026-07-28', description: 'Coffee Shop', category: 'Food', amount: -18.00 },
    { id: 't5', date: '2026-07-25', description: 'Transfer from Savings', category: 'Transfer', amount: 500.00 },
  ],
  2: [
    { id: 't6', date: '2026-08-02', description: 'Interest Credit', category: 'Income', amount: 45.20 },
    { id: 't7', date: '2026-07-15', description: 'Transfer to Checking', category: 'Transfer', amount: -500.00 },
    { id: 't8', date: '2026-07-01', description: 'Deposit', category: 'Income', amount: 2000.00 },
  ],
  3: [
    { id: 't9', date: '2026-08-01', description: 'Online Store', category: 'Shopping', amount: -340.50 },
    { id: 't10', date: '2026-07-29', description: 'Gas Station', category: 'Transport', amount: -65.00 },
    { id: 't11', date: '2026-07-20', description: 'Restaurant', category: 'Food', amount: -120.00 },
  ],
};

@Injectable({ providedIn: 'root' })
export class LedgerService {
  readonly accounts = signal<Account[]>(ACCOUNTS);

  getAccount(id: number): Account | undefined {
    return this.accounts().find(a => a.id === id);
  }

  getTransactions(accountId: number): Transaction[] {
    return TRANSACTIONS[accountId] ?? [];
  }

  getLedger(accountId: number): LedgerLine[] {
    const account = this.getAccount(accountId);
    const txs = [...this.getTransactions(accountId)].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    let balance = account?.balance ?? 0;
    const lines: LedgerLine[] = [];
    for (const tx of txs) {
      lines.push({ tx, balance });
      balance -= tx.amount;
    }
    return lines;
  }

  getSpending(accountId: number): { category: string; total: number }[] {
    const map = new Map<string, number>();
    for (const tx of this.getTransactions(accountId)) {
      if (tx.amount < 0) {
        map.set(tx.category, (map.get(tx.category) ?? 0) + Math.abs(tx.amount));
      }
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  async transfer(fromId: number, toId: number, amount: number, note: string): Promise<TransferResult> {
    await new Promise(r => setTimeout(r, 600));
    const from = this.getAccount(fromId)!;
    const to = this.getAccount(toId)!;

    this.accounts.update(list =>
      list.map(a => {
        if (a.id === fromId) return { ...a, balance: a.balance - amount };
        if (a.id === toId) return { ...a, balance: a.balance + amount };
        return a;
      }),
    );

    return {
      reference: `TX-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      fromAccount: { ...from, balance: from.balance - amount },
      toAccount: { ...to, balance: to.balance + amount },
      amount,
      note,
    };
  }
}
