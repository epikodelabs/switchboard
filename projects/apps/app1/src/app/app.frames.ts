import {
  frame,
  redirect,
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
 * The authored navigation tree is frames. Paths, params, query schemas, and
 * redirect targets live with the frame definitions.
 */
export const frames = [
  redirect('/', booksFrame),
  redirect('/legacy', booksFrame),

  frame('ledger', '/ledger', LedgerShellPage, {
    transitions: ['books', 'account', 'journal', 'entry', 'trial', 'settings'],
    children: [
      redirect('', booksFrame),
      booksFrame,
      accountFrame,
      journalFrame,
      entryFrame,
      trialFrame,
      settingsFrame,
    ],
  }),
] as const;