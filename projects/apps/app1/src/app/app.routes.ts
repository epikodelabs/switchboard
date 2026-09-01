import {
  layout,
  navigation,
  redirect,
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
 * Frames own their public address, lifecycle, schemas, outlets and graph edges.
 * Layouts only compose UI; URLs no longer need a second address(...) layer.
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
    redirect('/', '/ledger/books'),
    redirect('/legacy', '/ledger/books'),

    layout('/ledger', ledgerShellFrame, [
      redirect('', '/ledger/books'),
      booksFrame,
      accountFrame,
      journalFrame,
      entryFrame,
      trialFrame,
      settingsFrame,
    ]),
  ] as const,
});
