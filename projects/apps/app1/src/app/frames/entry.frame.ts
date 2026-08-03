import { inject } from '@angular/core';
import { frame, s, view } from '@epikodelabs/switchboard';
import { EntryPage } from '../components/entry.page';
import { LedgerService } from '../services/ledger.service';

export const entryFrame = frame(
  'entry',
  view(EntryPage, {
    prepare: [
      async context => ({
        entry: await inject(LedgerService).prepareEntry(
          String(context.params['entryId'] ?? ''),
        ),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: ['books', 'journal', 'account'],
    paramsSchema: {
      entryId: s.string(),
    },
  },
);
