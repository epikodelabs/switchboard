import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
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
    outlets: [
      frameOutlet(
        'sidebar',
        view(WorkspaceSidebarComponent),
      ),
    ],
  },
);
