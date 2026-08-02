import {
  frame,
  frameOutlet,
  s,
  view,
} from '@epikodelabs/switchboard';

import {
  SettingsPage,
  SettingsSidebarComponent,
} from '../components/demo-pages';
import { appFrameNavigation } from './frame-graph';

export const settingsFrame = frame(
  'settings',
  view(SettingsPage),
  {
    ...appFrameNavigation('settings'),
    querySchema: {
      section: s.string('general'),
    },
    outlets: [
      frameOutlet(
        'sidebar',
        view(SettingsSidebarComponent),
      ),
    ],
  },
);
