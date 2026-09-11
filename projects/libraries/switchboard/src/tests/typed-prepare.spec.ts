import { frame } from '../lib/frame-builders';
import type { InferFrameData } from '../lib/navigation-definitions';

class Page {}

const preparedRoute = frame(
  'project',
  '/projects/:projectId',
  Page,
  {
    prepare: [
      async () => ({ project: { id: 1, name: 'Waypoint parity' } }),
      () => ({ permissions: ['read'] as const }),
    ],
    afterEnter: [route => {
      route.data.project.name.toUpperCase();
      route.data.permissions[0];
    }],
  },
);

type Prepared = InferFrameData<typeof preparedRoute>;
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
