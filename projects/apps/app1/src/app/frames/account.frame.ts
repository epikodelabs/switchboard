import { inject } from '@angular/core';
import { frame, frameOutlet, s, view } from '@epikodelabs/switchboard';
import { AccountPage } from '../components/account.page';
import { SidebarComponent } from '../components/sidebar.component';
import { LedgerService } from '../services/ledger.service';

export const accountFrame = frame(
  'account',
  view(AccountPage, {
    prepare: [
      async context => {
        const service = inject(LedgerService);
        const id = Number(context.params['accountId'] ?? 0);
        return {
          account: service.getAccount(id),
          ledger: service.getLedger(id),
        };
      },
    ],
  }),
  {
    directEntry: true,
    transitions: ['dashboard', 'spending', 'transfer'],
    paramsSchema: {
      accountId: s.number({ min: 1 }),
    },
    outlets: [
      frameOutlet('sidebar', view(SidebarComponent)),
    ],
  },
);
