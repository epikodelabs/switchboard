import { inject } from '@angular/core';
import { frame, s } from '@epikodelabs/switchboard';
import { JournalPage } from '../components/journal.page';
import { LedgerService } from '../services/ledger.service';

export const journalFrame = frame('journal', '/journal', JournalPage, {
  query: {
    entryId: s.optional(s.string()),
    accountId: s.optional(s.string()),
  },
  directEntry: true,
  transitions: ['books', 'entry', 'account'],
  prepare: async context => ({
    form: await inject(LedgerService).prepareJournalForm(
      context.query['entryId'] ? String(context.query['entryId']) : undefined,
    ),
  }),
});
