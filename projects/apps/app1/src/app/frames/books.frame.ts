import { inject } from '@angular/core';
import { frame, frameOutlet, view } from '@epikodelabs/switchboard';
import { BooksPage } from '../components/books.page';
import { BooksSidebarComponent } from '../components/books-sidebar.component';
import { LedgerService } from '../services/ledger.service';

export const booksFrame = frame(
  'books',
  view(BooksPage, {
    prepare: [
      async () => ({
        snapshot: await inject(LedgerService).prepareBooks(),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: ['account', 'journal', 'entry', 'trial', 'settings'],
    outlets: [frameOutlet('sidebar', view(BooksSidebarComponent))],
  },
);
