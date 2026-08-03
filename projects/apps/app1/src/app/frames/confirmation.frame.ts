import { frame, view } from '@epikodelabs/switchboard';
import { ConfirmationPage } from '../components/confirmation.page';

export const confirmationFrame = frame(
  'confirmation',
  view(ConfirmationPage, {
    prepare: [
      async context => ({
        result: context.historyState as any,
      }),
    ],
  }),
  {
    transitions: ['dashboard', 'account'],
    directEntryRedirectTo: { name: 'dashboard' },
  },
);
