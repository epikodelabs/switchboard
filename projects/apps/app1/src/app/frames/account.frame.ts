import { inject } from '@angular/core';
import { frame, s } from '@epikodelabs/switchboard';
import { AccountPage } from '../components/account.page';
import { AccountSidebarComponent } from '../components/account-sidebar.component';
import { LedgerService } from '../services/ledger.service';

export const accountFrame = frame('account', AccountPage, {
  address: '/account/:accountId',
  directEntry: true,
  transitions: ['books', 'journal', 'entry', 'trial'],
  params: {
    accountId: s.string(),
  },
  outlets: {
    sidebar: AccountSidebarComponent,
  },
  prepare: async context => ({
    snapshot: await inject(LedgerService).prepareAccount(
      String(context.params['accountId'] ?? ''),
    ),
  }),
});
