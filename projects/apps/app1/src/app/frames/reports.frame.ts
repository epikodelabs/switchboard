import {
  frame,
  frameOutlet,
  lazyView,
  view,
} from '@epikodelabs/switchboard';

import { ReportsSidebarComponent } from '../components/demo-pages';

export const reportsFrame = frame(
  'reports',
  lazyView(() =>
    import('../components/reports.page')
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
