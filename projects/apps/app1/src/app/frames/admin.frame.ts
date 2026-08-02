import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  view,
} from '@epikodelabs/switchboard';

import {
  AdminPage,
  AdminSidebarComponent,
} from '../components/demo-pages';
import { DemoSessionService } from '../services/demo-session.service';
import { appFrameNavigation } from './frame-graph';

export const adminFrame = frame(
  'admin',
  view(AdminPage, {
    beforeEnter: [
      () => {
        const session = inject(DemoSessionService);

        return session.adminAccess()
          || {
            redirectTo: {
              frame: 'settings',
              query: {
                section: 'access',
              },
            },
            replace: true,
          };
      },
    ],
    prepare: [
      () => ({
        audit:
          inject(DemoSessionService)
            .createAdminAudit(),
      }),
    ],
  }),
  {
    ...appFrameNavigation('admin'),
    outlets: [
      frameOutlet(
        'sidebar',
        view(AdminSidebarComponent),
      ),
    ],
  },
);
