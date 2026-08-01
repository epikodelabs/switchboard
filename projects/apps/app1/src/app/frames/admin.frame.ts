import { inject } from '@angular/core';
import {
  frame,
  frameOutlet,
  frameRoute,
} from '@epikodelabs/switchboard';

import {
  AdminPage,
  AdminSidebarComponent,
} from '../demo-pages';
import { DemoSessionService } from '../demo-session.service';

export const adminFrame = frameRoute(
  '/admin',
  frame(AdminPage, {
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
    name: 'admin',
  },
  [
    frameOutlet(
      'sidebar',
      frame(AdminSidebarComponent),
    ),
  ],
);
