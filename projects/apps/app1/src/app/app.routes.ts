import {
  address,
  layout,
  navigation,
  redirectRoute,
} from '@epikodelabs/switchboard';

import {
  adminFrame,
  appShellFrame,
  editorFrame,
  introFrame,
  reportsFrame,
  settingsFrame,
  workspaceFrame,
} from './frames';

export const routes = navigation({
  frames: [
    introFrame,
    workspaceFrame,
    settingsFrame,
    editorFrame,
    reportsFrame,
    adminFrame,
  ] as const,
  entries: [
    address('/', introFrame),
    redirectRoute(
      '/legacy',
      '/app/workspace/101?view=activity&page=2&filters=legacy',
    ),
    layout('/app', appShellFrame, [
      redirectRoute(
        '',
        '/app/workspace/101?view=overview&page=1&filters=open&filters=recent',
      ),
      address('/workspace/:projectId', workspaceFrame),
      address('/settings', settingsFrame),
      address('/editor/:draftId', editorFrame),
      address('/reports', reportsFrame),
      address('/admin', adminFrame),
    ]),
  ] as const,
});
