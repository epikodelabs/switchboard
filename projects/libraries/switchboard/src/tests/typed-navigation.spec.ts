import {
  frame,
  s,
  type FrameRuntime,
} from '@epikodelabs/switchboard';

class DashboardLayout {}
class DashboardPage {}
class SettingsPage {}

const dashboardFrame = frame('dashboard', '/dashboard/:projectId', DashboardPage, {
  params: {
    projectId: s.number({ min: 1 }),
  },
  query: {
    tab: s.string('overview'),
    page: s.number({ default: 1, min: 1 }),
    filters: s.array(),
    draft: s.optional(s.boolean()),
  },
});

const settingsFrame = frame('settings', '/settings', SettingsPage, {
  query: {
    section: s.string('general'),
  },
});

const frames = [
  frame('app', '/app', DashboardLayout, {
    layout: [
      settingsFrame,
      dashboardFrame,
    ],
  }),
] as const;

function assertNamedNavigation(navigator: FrameRuntime<typeof frames>): void {
  void navigator.navigateTo.dashboard({
    params: { projectId: 123 },
  });

  void navigator.navigateTo.dashboard({
    params: { projectId: 123 },
    query: {
      tab: 'settings',
      page: 2,
      filters: ['a', 'b'],
      draft: true,
    },
  });

  void navigator.navigateTo.settings({
    query: { section: 'billing' },
  });

  const href = navigator.hrefTo.dashboard({
    params: { projectId: 123 },
    query: { tab: 'overview' },
  });

  const typedHref: string | null = href;
  void typedHref;

  // @ts-expect-error frame name must exist in the configured navigation tree
  void navigator.navigateTo.missing();
}

describe('typed frame navigation typings', () => {
  it('discovers named frames nested inside layouts', () => {
    expect(typeof assertNamedNavigation).toBe('function');
  });
});
