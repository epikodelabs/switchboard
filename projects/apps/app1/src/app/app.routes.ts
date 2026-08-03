import {
  address,
  layout,
  navigation,
  redirectRoute,
} from '@epikodelabs/switchboard';

import {
  accountFrame,
  booksFrame,
  entryFrame,
  journalFrame,
  ledgerShellFrame,
  settingsFrame,
  trialFrame,
} from './frames';

/**
 * Each frame id is used as the route name exactly once.
 * Root and /legacy only redirect — they do not re-bind booksFrame.
 */
export const routes = navigation({
  frames: [
    booksFrame,
    accountFrame,
    journalFrame,
    entryFrame,
    trialFrame,
    settingsFrame,
  ] as const,
  entries: [
    // Public landing → books inside the ledger shell
    redirectRoute('/', '/ledger/books'),
    redirectRoute('/legacy', '/ledger/books'),

    layout('/ledger', ledgerShellFrame, [
      redirectRoute('', '/ledger/books'),
      address('/books', booksFrame),
      address('/account/:accountId', accountFrame),
      address('/journal', journalFrame),
      address('/entry/:entryId', entryFrame),
      address('/trial', trialFrame),
      address('/settings', settingsFrame),
    ]),
  ] as const,
});
