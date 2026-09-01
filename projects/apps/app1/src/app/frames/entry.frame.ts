import { inject } from '@angular/core';
import { frame, s } from '@epikodelabs/switchboard';
import { EntryPage } from '../components/entry.page';
import { LedgerService } from '../services/ledger.service';

export const entryFrame = frame('entry', EntryPage, {
  address: '/entry/:entryId',
  directEntry: true,
  transitions: ['books', 'journal', 'account'],
  params: {
    entryId: s.string(),
  },
  prepare: async context => ({
    entry: await inject(LedgerService).prepareEntry(
      String(context.params['entryId'] ?? ''),
    ),
  }),
});
