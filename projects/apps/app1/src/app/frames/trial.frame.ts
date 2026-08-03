import { inject } from '@angular/core';
import { frame, view } from '@epikodelabs/switchboard';
import { TrialPage } from '../components/trial.page';
import { LedgerService } from '../services/ledger.service';

export const trialFrame = frame(
  'trial',
  view(TrialPage, {
    prepare: [
      async () => ({
        rows: await inject(LedgerService).prepareTrialBalance(),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: ['books', 'account', 'journal'],
  },
);
