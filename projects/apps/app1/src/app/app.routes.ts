import {
  layout,
  redirectRoute,
  type StreamixRoutes,
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

export const routes = [
  introFrame,
  redirectRoute(
    '/legacy',
    '/app/workspace/101?view=activity&page=2&filters=legacy',
  ),
  layout('/app', appShellFrame, [
    redirectRoute(
      '',
      '/app/workspace/101?view=overview&page=1&filters=open&filters=recent',
    ),
    workspaceFrame,
    settingsFrame,
    editorFrame,
    reportsFrame,
    adminFrame,
  ]),
] as const satisfies StreamixRoutes;
