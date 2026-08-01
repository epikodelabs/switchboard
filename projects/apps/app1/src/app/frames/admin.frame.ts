import { inject } from '@angular/core';
import {
  defineFrameOutlet,
  defineFrameRoute,
  frame,
} from '@epikodelabs/switchboard';

import {
  AdminPage,
  AdminSidebarComponent,
} from '../demo-pages';
import { DemoSessionService } from '../demo-session.service';

export const adminFrame = defineFrameRoute(
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
    defineFrameOutlet(
      'sidebar',
      frame(AdminSidebarComponent),
    ),
  ],
);
