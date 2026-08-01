import {
  buildFrameRoutes,
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
  ...buildFrameRoutes(introFrame),
  redirectRoute(
    '/legacy',
    '/app/workspace/101?view=activity&page=2&filters=legacy',
  ),
  layout('/app', appShellFrame, [
    redirectRoute(
      '',
      '/app/workspace/101?view=overview&page=1&filters=open&filters=recent',
    ),
    ...buildFrameRoutes(workspaceFrame),
    ...buildFrameRoutes(settingsFrame),
    ...buildFrameRoutes(editorFrame),
    ...buildFrameRoutes(reportsFrame),
    ...buildFrameRoutes(adminFrame),
  ]),
] as const satisfies StreamixRoutes;
