import {
  frame,
  frameOutlet,
  lazyView,
  view,
} from '@epikodelabs/switchboard';

import { ReportsSidebarComponent } from '../components/demo-pages';
import { appFrameNavigation } from './frame-graph';

export const reportsFrame = frame(
  'reports',
  lazyView(() =>
    import('../components/reports.page')
      .then(module => module.ReportsPage),
  ),
  {
    ...appFrameNavigation('reports'),
    outlets: [
      frameOutlet(
        'sidebar',
        view(ReportsSidebarComponent),
      ),
    ],
  },
);
