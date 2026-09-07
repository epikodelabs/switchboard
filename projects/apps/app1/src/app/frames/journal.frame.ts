import { inject } from '@angular/core';
import { frame } from '@epikodelabs/switchboard';
import { JournalPage } from '../components/journal.page';
import { LedgerService } from '../services/ledger.service';

export const journalFrame = frame('journal', JournalPage, {
  directEntry: true,
  transitions: ['books', 'entry', 'account'],
  prepare: async context => ({
    form: await inject(LedgerService).prepareJournalForm(
      context.query['entryId'] ? String(context.query['entryId']) : undefined,
    ),
  }),
});
