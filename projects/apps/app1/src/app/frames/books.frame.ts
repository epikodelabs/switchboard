import { inject } from '@angular/core';
import { frame } from '@epikodelabs/switchboard';
import { BooksPage } from '../components/books.page';
import { BooksSidebarComponent } from '../components/books-sidebar.component';
import { LedgerService } from '../services/ledger.service';

export const booksFrame = frame('books', BooksPage, {
  address: '/books',
  directEntry: true,
  transitions: ['account', 'journal', 'entry', 'trial', 'settings'],
  outlets: {
    sidebar: BooksSidebarComponent,
  },
  prepare: async () => ({
    snapshot: await inject(LedgerService).prepareBooks(),
  }),
});
