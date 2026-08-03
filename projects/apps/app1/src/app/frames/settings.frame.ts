import { frame, view } from '@epikodelabs/switchboard';
import { SettingsPage } from '../components/settings.page';

export const settingsFrame = frame(
  'settings',
  view(SettingsPage),
  {
    directEntry: true,
    transitions: ['books'],
  },
);
