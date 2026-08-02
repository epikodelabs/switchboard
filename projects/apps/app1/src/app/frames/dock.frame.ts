import {
  frame,
  view,
} from '@epikodelabs/switchboard';

import { DockPage } from '../components/dock.page';

export const dockFrame = frame(
  'dock',
  view(DockPage),
  {
    directEntry: true,
    transitions: [
      'mission',
      'analysis',
    ],
  },
);
