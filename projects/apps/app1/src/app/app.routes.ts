import {
  layout,
  redirect,
  route,
  s,
} from '@epikodelabs/switchboard';

import { LedgerShellPage } from './components/ledger-shell.page';

import {
  accountFrame,
  booksFrame,
  entryFrame,
  journalFrame,
  trialFrame,
  settingsFrame,
} from './frames';

/**
 * Frames own their identity, graph edges, outlets, and lifecycle behavior.
 * Routes place frames at URLs; params and query schemas live where the path
 * is declared.
 */
export const routes = [
  redirect('/', '/ledger/books'),
  redirect('/legacy', '/ledger/books'),

  layout('/ledger', LedgerShellPage, [
    redirect('', '/ledger/books'),
    route('/books', booksFrame),
    route('/account/:accountId', accountFrame, {
      params: {
        accountId: s.string(),
      },
    }),
    route('/journal', journalFrame, {
      query: {
        entryId: s.optional(s.string()),
        accountId: s.optional(s.string()),
      },
    }),
    route('/entry/:entryId', entryFrame, {
      params: {
        entryId: s.string(),
      },
    }),
    route('/trial', trialFrame),
    route('/settings', settingsFrame),
  ]),
] as const;
