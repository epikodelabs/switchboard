import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  view,
} from '@epikodelabs/switchboard';

import {
  WorkspacePage,
  WorkspaceSidebarComponent,
} from '../demo-pages';
import { DemoSessionService } from '../demo-session.service';

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
    transitions: [
      'settings',
      'editor',
      'reports',
      'admin',
    ],
    outlets: [
      frameOutlet(
        'sidebar',
        view(WorkspaceSidebarComponent),
      ),
    ],
  },
);
