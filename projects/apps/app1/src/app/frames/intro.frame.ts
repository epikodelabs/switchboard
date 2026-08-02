import {
  frame,
  view,
} from '@epikodelabs/switchboard';

import { IntroPage } from '../components/demo-pages';

export const introFrame = frame(
  'intro',
  view(IntroPage),
  {
    directEntry: true,
    transitions: [
      'workspace',
      'settings',
    ],
  },
);
