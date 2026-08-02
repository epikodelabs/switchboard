import {
  layout,
  redirectRoute,
  route,
  s,
  type NavigationTree,
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
  route('/', introFrame),
  redirectRoute(
    '/legacy',
    '/app/workspace/101?view=activity&page=2&filters=legacy',
  ),
  layout('/app', appShellFrame, [
    redirectRoute(
      '',
      '/app/workspace/101?view=overview&page=1&filters=open&filters=recent',
    ),
    route('/workspace/:projectId', workspaceFrame, {
      paramsSchema: {
        projectId: s.number({ min: 1 }),
      },
      querySchema: {
        view: s.string('overview'),
        page: s.number({ default: 1, min: 1 }),
        filters: s.array(),
        draft: s.optional(s.boolean()),
      },
    }),
    route('/settings', settingsFrame, {
      querySchema: {
        section: s.string('general'),
      },
    }),
    route('/editor/:draftId', editorFrame, {
      paramsSchema: {
        draftId: s.number({ min: 1 }),
      },
      querySchema: {
        mode: s.string('write'),
      },
    }),
    route('/reports', reportsFrame),
    route('/admin', adminFrame),
  ]),
] as const satisfies NavigationTree;

