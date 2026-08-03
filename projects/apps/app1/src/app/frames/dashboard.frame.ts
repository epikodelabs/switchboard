import { frame, frameOutlet, view } from '@epikodelabs/switchboard';
import { DashboardPage } from '../components/dashboard.page';
import { SidebarComponent } from '../components/sidebar.component';

export const dashboardFrame = frame(
  'dashboard',
  view(DashboardPage),
  {
    directEntry: true,
    transitions: ['account', 'spending', 'transfer'],
    outlets: [
      frameOutlet('sidebar', view(SidebarComponent)),
    ],
  },
);
