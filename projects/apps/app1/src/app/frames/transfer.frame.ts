import { frame, view } from '@epikodelabs/switchboard';
import { TransferPage } from '../components/transfer.page';

export const transferFrame = frame(
  'transfer',
  view(TransferPage),
  {
    transitions: ['confirmation', 'dashboard'],
  },
);
