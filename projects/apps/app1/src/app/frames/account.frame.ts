import { inject } from '@angular/core';
import { frame, frameOutlet, s, view } from '@epikodelabs/switchboard';
import { AccountPage } from '../components/account.page';
import { AccountSidebarComponent } from '../components/account-sidebar.component';
import { LedgerService } from '../services/ledger.service';

export const accountFrame = frame(
  'account',
  view(AccountPage, {
    prepare: [
      async context => ({
        snapshot: await inject(LedgerService).prepareAccount(
          String(context.params['accountId'] ?? ''),
        ),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: ['books', 'journal', 'entry', 'trial'],
    paramsSchema: {
      accountId: s.string(),
    },
    outlets: [frameOutlet('sidebar', view(AccountSidebarComponent))],
  },
);
