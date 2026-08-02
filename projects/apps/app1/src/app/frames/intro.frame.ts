import {
  frame,
  view,
} from '@epikodelabs/switchboard';

import { IntroPage } from '../components/demo-pages';
import { appFrameNavigation } from './frame-graph';

export const introFrame = frame(
  'intro',
  view(IntroPage),
  appFrameNavigation('intro'),
);
