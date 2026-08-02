import {
  frame,
  frameOutlet,
  lazyView,
  view,
} from '@epikodelabs/switchboard';

import { ReportsSidebarComponent } from '../demo-pages';

export const reportsFrame = frame(
  'reports',
  lazyView(() =>
    import('../reports.page')
      .then(module => module.ReportsPage),
  ),
  {
    transitions: [
      'workspace',
      'settings',
      'editor',
      'admin',
    ],
    outlets: [
      frameOutlet(
        'sidebar',
        view(ReportsSidebarComponent),
      ),
    ],
  },
);
