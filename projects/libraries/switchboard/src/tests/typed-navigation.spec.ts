import {
  address,
  frame,
  layout,
  navigation,
  route,
  s,
  type Router,
  view,
} from '@epikodelabs/switchboard';

class DashboardLayout {}
class DashboardPage {}
class SettingsPage {}
class LegacyPage {}

const dashboardFrame = frame(
  'dashboard',
  view(DashboardPage),
  {
    paramsSchema: {
      projectId: s.number({ min: 1 }),
    },
    querySchema: {
      tab: s.string('overview'),
      page: s.number({ default: 1, min: 1 }),
      filters: s.array(),
      draft: s.optional(s.boolean()),
    },
  },
);

const settingsFrame = frame(
  'settings',
  view(SettingsPage),
  {
    querySchema: {
      section: s.string('general'),
    },
  },
);

const routes = navigation({
  frames: [
    settingsFrame,
    dashboardFrame,
  ] as const,
  entries: [
    layout('/app', DashboardLayout, [
      address('/settings', settingsFrame),
      address('/dashboard/:projectId', dashboardFrame),
      route('/legacy', LegacyPage),
    ]),
  ] as const,
});

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

  // @ts-expect-error route name must exist in the configured navigation definition
  void router.navigateTo.missing();
}

describe('typed routes typings', () => {
  it('discovers named frame addresses nested inside layouts', () => {
    expect(typeof assertNamedNavigation).toBe('function');
  });
});