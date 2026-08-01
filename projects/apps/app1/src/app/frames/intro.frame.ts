import {
  defineFrameRoute,
  frame,
} from '@epikodelabs/switchboard';

import { IntroPage } from '../demo-pages';

export const introFrame = defineFrameRoute(
  '/',
  frame(IntroPage),
);
