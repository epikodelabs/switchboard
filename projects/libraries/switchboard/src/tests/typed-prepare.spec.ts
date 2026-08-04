import { route, view } from '../lib/route-builders';
import type { InferRoutePreparedData } from '../lib/navigation-definitions';

class Page {}

const preparedRoute = route(
  '/projects/:projectId',
  view(Page, {
    prepare: [
      async () => ({ project: { id: 1, name: 'Waypoint parity' } }),
      () => ({ permissions: ['read'] as const }),
    ],
    afterEnter: [route => {
      route.data.project.name.toUpperCase();
      route.data.permissions[0];
    }],
  }),
);

type Prepared = InferRoutePreparedData<typeof preparedRoute>;
const prepared: Prepared = {
  project: { id: 1, name: 'Waypoint parity' },
  permissions: ['read'],
};

describe('Switchboard typed preparation', () => {
  it('preserves merged prepare result types', () => {
    expect(prepared.project.id).toBe(1);
    expect(prepared.permissions).toEqual(['read']);
  });
});