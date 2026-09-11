import { Component, Input } from '@angular/core';

import {
  bindFrameInputs,
} from '@epikodelabs/switchboard';

type ActivatedRoute = Parameters<typeof bindFrameInputs>[2];

function createRoute(
  overrides: Partial<ActivatedRoute> = {},
): ActivatedRoute {
  return {
    path: '/projects/42',
    params: {},
    query: {},
    data: {},
    ...overrides,
  } as ActivatedRoute;
}

describe('navigation adapters', () => {
  it('binds frame inputs by source instead of flattening them', () => {
    const target = {
      setInput: jasmine.createSpy('setInput'),
    };

    @Component({ template: '' })
    class TestInputsComponent {
      @Input() params!: Record<string, unknown>;
      @Input() query!: Record<string, unknown>;
      @Input() data!: Record<string, unknown>;
      @Input() projectId!: number;
    }

    const route = createRoute({
      params: {
        projectId: '7',
        section: 'overview',
      },
      query: {
        tab: 'activity',
        sort: 'oldest',
      },
      data: {
        'project-id': 42,
        user: 'Ada',
        __params: {
          projectId: 42,
        },
        __query: {
          tab: 'settings',
        },
        sort: 'recent',
      },
    });

    bindFrameInputs(target, TestInputsComponent, route);

    expect(target.setInput).toHaveBeenCalledTimes(3);
    expect(target.setInput).toHaveBeenCalledWith(
      'params',
      {
        projectId: 42,
        section: 'overview',
      },
    );
    expect(target.setInput).toHaveBeenCalledWith(
      'query',
      {
        tab: 'settings',
        sort: 'oldest',
      },
    );
    expect(target.setInput).toHaveBeenCalledWith(
      'data',
      {
        'project-id': 42,
        user: 'Ada',
        sort: 'recent',
      },
    );
    expect(target.setInput).not.toHaveBeenCalledWith('projectId', jasmine.anything());
  });
});
