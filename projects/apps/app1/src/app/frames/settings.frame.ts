import {
  frame,
  frameOutlet,
  view,
} from '@epikodelabs/switchboard';

import {
  SettingsPage,
  SettingsSidebarComponent,
} from '../demo-pages';

export const settingsFrame = frame(
  'settings',
  view(SettingsPage),
  {
    transitions: [
      'workspace',
      'editor',
      'reports',
      'admin',
    ],
    outlets: [
      frameOutlet(
        'sidebar',
        view(SettingsSidebarComponent),
      ),
    ],
  },
);
