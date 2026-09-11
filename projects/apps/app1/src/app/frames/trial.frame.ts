import { inject } from '@angular/core';
import { frame } from '@epikodelabs/switchboard';
import { TrialPage } from '../components/trial.page';
import { LedgerService } from '../services/ledger.service';

export const trialFrame = frame('trial', '/trial', TrialPage, {
  directEntry: true,
  transitions: ['books', 'account', 'journal'],
  prepare: async () => ({
    rows: await inject(LedgerService).prepareTrialBalance(),
  }),
});
