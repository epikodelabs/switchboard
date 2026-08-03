import { inject } from '@angular/core';
import { frame, frameOutlet, s, view } from '@epikodelabs/switchboard';
import { SpendingPage } from '../components/spending.page';
import { SidebarComponent } from '../components/sidebar.component';
import { LedgerService } from '../services/ledger.service';

export const spendingFrame = frame(
  'spending',
  view(SpendingPage, {
    prepare: [
      async context => {
        const service = inject(LedgerService);
        const id = Number(context.params['accountId'] ?? 0);
        const account = service.getAccount(id);
        return {
          accountName: account?.name ?? '',
          categories: service.getSpending(id),
        };
      },
    ],
  }),
  {
    directEntry: true,
    transitions: ['dashboard', 'account'],
    paramsSchema: {
      accountId: s.number({ min: 1 }),
    },
    outlets: [
      frameOutlet('sidebar', view(SidebarComponent)),
    ],
  },
);
