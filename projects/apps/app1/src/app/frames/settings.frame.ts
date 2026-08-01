import {
  frame,
  frameOutlet,
  frameRoute,
  s,
} from '@epikodelabs/switchboard';

import {
  SettingsPage,
  SettingsSidebarComponent,
} from '../demo-pages';

export const settingsFrame = frameRoute(
  '/settings',
  frame(SettingsPage),
  {
    name: 'settings',
    querySchema: {
      section: s.string('general'),
    },
  },
  [
    frameOutlet(
      'sidebar',
      frame(SettingsSidebarComponent),
    ),
  ],
);
