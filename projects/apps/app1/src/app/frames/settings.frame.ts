import {
  defineFrameOutlet,
  defineFrameRoute,
  frame,
  s,
} from '@epikodelabs/switchboard';

import {
  SettingsPage,
  SettingsSidebarComponent,
} from '../demo-pages';

export const settingsFrame = defineFrameRoute(
  '/settings',
  frame(SettingsPage),
  {
    name: 'settings',
    querySchema: {
      section: s.string('general'),
    },
  },
  [
    defineFrameOutlet(
      'sidebar',
      frame(SettingsSidebarComponent),
    ),
  ],
);
