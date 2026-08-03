import {
  address,
  layout,
  navigation,
  redirectRoute,
} from '@epikodelabs/switchboard';

import {
  accountFrame,
  confirmationFrame,
  dashboardFrame,
  shellView,
  spendingFrame,
  transferFrame,
} from './frames';

export const routes = navigation({
  frames: [
    dashboardFrame,
    accountFrame,
    spendingFrame,
    transferFrame,
    confirmationFrame,
  ] as const,
  entries: [
    redirectRoute('/', '/ledger'),
    layout('/ledger', shellView, [
      address('/', dashboardFrame),
      address('/account/:accountId', accountFrame),
      address('/spending/:accountId', spendingFrame),
      transferFrame,
      confirmationFrame,
    ]),
  ] as const,
});
