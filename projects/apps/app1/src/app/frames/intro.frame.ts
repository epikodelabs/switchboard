import {
  frameRoute,
  frame,
} from '@epikodelabs/switchboard';

import { IntroPage } from '../demo-pages';

export const introFrame = frameRoute(
  '/',
  frame(IntroPage),
);
