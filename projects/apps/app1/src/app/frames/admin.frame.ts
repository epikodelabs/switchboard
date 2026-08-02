import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  view,
} from '@epikodelabs/switchboard';

import {
  AdminPage,
  AdminSidebarComponent,
} from '../demo-pages';
import { DemoSessionService } from '../demo-session.service';

export const adminFrame = frame(
  'admin',
  view(AdminPage, {
    beforeEnter: [
      () => {
        const session = inject(DemoSessionService);

        return session.adminAccess()
          || {
            redirectTo: '/app/settings?section=access',
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
    transitions: [
      'workspace',
      'settings',
      'editor',
      'reports',
    ],
    outlets: [
      frameOutlet(
        'sidebar',
        view(AdminSidebarComponent),
      ),
    ],
  },
);
