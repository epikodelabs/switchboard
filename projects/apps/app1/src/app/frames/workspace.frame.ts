import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  s,
  view,
} from '@epikodelabs/switchboard';

import {
  WorkspacePage,
  WorkspaceSidebarComponent,
} from '../components/demo-pages';
import { DemoSessionService } from '../services/demo-session.service';
import { appFrameNavigation } from './frame-graph';

export const workspaceFrame = frame(
  'workspace',
  view(WorkspacePage, {
    prepare: [
      context => {
        const projectId = Number(
          context.params['projectId'] ?? 0,
        );

        return {
          snapshot:
            inject(DemoSessionService)
              .buildWorkspaceSnapshot(projectId),
        };
      },
    ],
  }),
  {
    ...appFrameNavigation('workspace'),
    paramsSchema: {
      projectId: s.number({ min: 1 }),
    },
    querySchema: {
      view: s.string('overview'),
      page: s.number({ default: 1, min: 1 }),
      filters: s.array(),
      draft: s.optional(s.boolean()),
    },
    outlets: [
      frameOutlet(
        'sidebar',
        view(WorkspaceSidebarComponent),
      ),
    ],
  },
);
