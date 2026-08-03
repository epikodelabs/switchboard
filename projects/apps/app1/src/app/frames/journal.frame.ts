import { inject } from '@angular/core';
import { frame, s, view } from '@epikodelabs/switchboard';
import { JournalPage } from '../components/journal.page';
import { LedgerService } from '../services/ledger.service';

export const journalFrame = frame(
  'journal',
  view(JournalPage, {
    prepare: [
      async context => ({
        form: await inject(LedgerService).prepareJournalForm(
          context.query['entryId'] ? String(context.query['entryId']) : undefined,
        ),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: ['books', 'entry', 'account'],
    querySchema: {
      entryId: s.optional(s.string()),
      accountId: s.optional(s.string()),
    },
  },
);
