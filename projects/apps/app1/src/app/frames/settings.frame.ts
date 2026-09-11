import { frame } from '@epikodelabs/switchboard';
import { SettingsPage } from '../components/settings.page';

export const settingsFrame = frame('settings', '/settings', SettingsPage, {
  directEntry: true,
  transitions: ['books'],
});
