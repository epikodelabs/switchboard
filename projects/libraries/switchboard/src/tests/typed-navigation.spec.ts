import {
  frame,
  layout,
  route,
  s,
  type Router,
} from '@epikodelabs/switchboard';

class DashboardLayout {}
class DashboardPage {}
class SettingsPage {}
class LegacyPage {}

const dashboardFrame = frame('dashboard', DashboardPage);

const settingsFrame = frame('settings', SettingsPage);

const routes = [
  layout('/app', DashboardLayout, [
    route('/settings', settingsFrame, {
      query: {
        section: s.string('general'),
      },
    }),
    route('/dashboard/:projectId', dashboardFrame, {
      params: {
        projectId: s.number({ min: 1 }),
      },
      query: {
        tab: s.string('overview'),
        page: s.number({ default: 1, min: 1 }),
        filters: s.array(),
        draft: s.optional(s.boolean()),
      },
    }),
    route('/legacy', LegacyPage),
  ]),
] as const;

function assertNamedNavigation(router: Router<typeof routes>): void {
  void router.navigateTo.dashboard({
    params: { projectId: 123 },
  });

  void router.navigateTo.dashboard({
    params: { projectId: 123 },
    query: {
      tab: 'settings',
      page: 2,
      filters: ['a', 'b'],
      draft: true,
    },
  });

  void router.navigateTo.settings({
    query: { section: 'billing' },
  });

  const href = router.hrefTo.dashboard({
    params: { projectId: 123 },
    query: { tab: 'overview' },
  });

  const typedHref: string | null = href;
  void typedHref;

  // @ts-expect-error route name must exist in the configured navigation tree
  void router.navigateTo.missing();
}

describe('typed routes typings', () => {
  it('discovers named frames nested inside layouts', () => {
    expect(typeof assertNamedNavigation).toBe('function');
  });
});
