import {
  frame,
  frameOutlet,
  frameRoute,
  lazyFrame,
} from '@epikodelabs/switchboard';

import { ReportsSidebarComponent } from '../demo-pages';

export const reportsFrame = frameRoute(
  '/reports',
  lazyFrame(() =>
    import('../reports.page')
      .then(module => module.ReportsPage),
  ),
  {
    name: 'reports',
  },
  [
    frameOutlet(
      'sidebar',
      frame(ReportsSidebarComponent),
    ),
  ],
);
