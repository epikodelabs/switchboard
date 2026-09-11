import { inject } from '@angular/core';
import { frame, s } from '@epikodelabs/switchboard';
import { EntryPage } from '../components/entry.page';
import { LedgerService } from '../services/ledger.service';

export const entryFrame = frame('entry', '/entry/:entryId', EntryPage, {
  params: {
    entryId: s.string(),
  },
  directEntry: true,
  transitions: ['books', 'journal', 'account'],
  prepare: async context => ({
    entry: await inject(LedgerService).prepareEntry(
      String(context.params['entryId'] ?? ''),
    ),
  }),
});
