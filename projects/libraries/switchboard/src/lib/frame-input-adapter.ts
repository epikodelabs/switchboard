import {
  reflectComponentType,
  type Type,
} from '@angular/core';

import type { ActivatedRoute } from './vanilla-router';

const componentInputs =
  new WeakMap<
    Type<unknown>,
    readonly {
      readonly templateName: string;
      readonly propName: string;
    }[]
  >();

export interface InputBindingTarget {
  setInput(name: string, value: unknown): void;
}

export function bindFrameInputs(
  target: InputBindingTarget,
  component: Type<unknown>,
  route: ActivatedRoute,
): void {
  let inputs =
    componentInputs.get(component);

  if (!inputs) {
    inputs =
      reflectComponentType(component)
        ?.inputs ?? [];

    componentInputs.set(
      component,
      inputs,
    );
  }

  const data = route.data ?? {};
  // Parsed frame inputs stay grouped by their source so component bindings are
  // explicit and collision-free.
  const values: Record<string, unknown> = {
    url: route.url,
    path: route.path,
    params: {
      ...route.params,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(((data as any)?.__params ?? {}) as Record<string, unknown>),
    },
    query: {
      ...route.query,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(((data as any)?.__query ?? {}) as Record<string, unknown>),
    },
    data: Object.fromEntries(
      Object.entries(data).filter(
        ([key]) =>
          key !== '__params' &&
          key !== '__query',
      ),
    ),
    historyState: route.historyState,
    config: route.config,
  };

  for (const input of inputs) {
    const value =
      values[input.templateName] ??
      values[input.propName];

    if (value !== undefined) {
      target.setInput(input.templateName, value);
    }
  }
}

