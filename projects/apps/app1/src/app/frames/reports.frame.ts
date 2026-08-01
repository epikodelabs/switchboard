import {
  defineFrameOutlet,
  defineFrameRoute,
  frame,
  lazyFrame,
} from '@epikodelabs/switchboard';

import { ReportsSidebarComponent } from '../demo-pages';

export const reportsFrame = defineFrameRoute(
  '/reports',
  lazyFrame(() =>
    import('../reports.page')
      .then(module => module.ReportsPage),
  ),
  {
    name: 'reports',
  },
  [
    defineFrameOutlet(
      'sidebar',
      frame(ReportsSidebarComponent),
    ),
  ],
);
