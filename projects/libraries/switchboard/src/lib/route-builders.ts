import type { Type } from '@angular/core';

import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import type {
  AddressDefinition,
  AddressOptions,
  FrameDefinition,
  FrameDefinitionOptions,
  Lazy,
  FrameView,
  FrameHooks,
  FramePrepareFn,
  InferPreparedData,
  LayoutDefinition,
  LayoutOptions,
  RedirectRouteDefinition,
  RenderableRoute,
  FrameOutlet,
  NavigationDefinition,
  RouteOptions,
  NavigationTree,
  ViewDefinition,
} from './navigation-definitions';

function isFrame(
  value: unknown,
): value is FrameView {
  return typeof value === 'object'
    && value !== null
    && 'kind' in value
    && value.kind === 'frame';
}

function isDefinedFrame(
  value: unknown,
): value is FrameDefinition {
  return typeof value === 'object'
    && value !== null
    && 'kind' in value
    && value.kind === 'defined-frame';
}

function isEagerFrame(
  value: FrameView,
): value is FrameView & { readonly component: Type<unknown> } {
  return 'component' in value
    && value.component !== undefined;
}

type ViewRecord =
  ViewDefinition & {
    readonly frame?: FrameView;
  };

function createViewRecord(
  view: Type<unknown> | FrameView,
): ViewRecord {
  if (isFrame(view)) {
    if (isEagerFrame(view)) {
      return {
        component: view.component,
        frame: view,
      };
    }

    return {
      loadComponent: view.loadComponent,
      frame: view,
    };
  }

  return {
    component: view,
    frame: undefined,
  };
}

function createFrameDefinitionView(
  view: Type<unknown> | FrameView,
): FrameView {
  if (isFrame(view)) {
    return view;
  }

  return {
    kind: 'frame',
    component: view,
  };
}

function createLazyViewRecord(
  view: Lazy<Type<unknown>> | FrameView,
): ViewRecord {
  if (isFrame(view)) {
    if (isEagerFrame(view)) {
      return {
        component: view.component,
        frame: view,
      };
    }

    return {
      loadComponent: view.loadComponent,
      frame: view,
    };
  }

  return {
    loadComponent: view,
    frame: undefined,
  };
}

export function view(
  component: Type<unknown>,
  hooks?: FrameHooks<undefined>,
): FrameView<InferPreparedData<undefined>>;
export function view<
  const TPrepare extends readonly FramePrepareFn[],
>(
  component: Type<unknown>,
  hooks: FrameHooks<TPrepare> & { readonly prepare: TPrepare },
): FrameView<InferPreparedData<TPrepare>>;
export function view(
  component: Type<unknown>,
  hooks: FrameHooks<any> = {},
): FrameView<any> {
  return {
    kind: 'frame',
    component,
    ...hooks,
  };
}

function normalizeHook<T>(value: T | readonly T[] | undefined): readonly T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value as T];
}

function normalizeFrameOutlets(
  outlets: FrameDefinitionOptions<any, any, any>['outlets'],
): readonly FrameOutlet[] {
  if (!outlets) return [];
  if (Array.isArray(outlets)) return outlets as readonly FrameOutlet[];
  return Object.freeze(
    Object.entries(outlets).map(([outlet, value]) => ({
      outlet,
      view: createFrameDefinitionView(value),
    })),
  );
}

function normalizeFrameDefinitionOptions<
  TParamsSchema extends ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined,
  TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  options:
    | FrameDefinitionOptions<TParamsSchema, TQuerySchema, TPrepare>
    | undefined,
): FrameDefinitionOptions<TParamsSchema, TQuerySchema, TPrepare> {
  return options ?? {};
}

export function lazyView(
  loadComponent: Lazy<Type<unknown>>,
  hooks?: FrameHooks<undefined>,
): FrameView<InferPreparedData<undefined>>;
export function lazyView<
  const TPrepare extends readonly FramePrepareFn[],
>(
  loadComponent: Lazy<Type<unknown>>,
  hooks: FrameHooks<TPrepare> & { readonly prepare: TPrepare },
): FrameView<InferPreparedData<TPrepare>>;
export function lazyView(
  loadComponent: Lazy<Type<unknown>>,
  hooks: FrameHooks<any> = {},
): FrameView<any> {
  return {
    kind: 'frame',
    loadComponent,
    ...hooks,
  };
}

type NormalizePrepareInput<TPrepare> =
  TPrepare extends readonly FramePrepareFn[]
    ? TPrepare
    : TPrepare extends FramePrepareFn
      ? readonly [TPrepare]
      : undefined;

export function frame<
  const TId extends string,
  const TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends QuerySchemaRecord | undefined = undefined,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined = import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  id: TId,
  component: Type<unknown> | FrameView<any>,
  definition: FrameDefinitionOptions<TParamsSchema, TQuerySchema, TPrepare> = {},
): FrameDefinition<
  TId,
  TParamsSchema,
  TQuerySchema,
  FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>>
> {
  const options = normalizeFrameDefinitionOptions(definition);
  const existing = createFrameDefinitionView(component);
  const frameView: FrameView<any> = {
    ...existing,
    beforeEnter: normalizeHook(options.beforeEnter) ?? existing.beforeEnter,
    beforeLeave: normalizeHook(options.beforeLeave) ?? existing.beforeLeave,
    prepare: normalizeHook(options.prepare) ?? existing.prepare,
    afterEnter: normalizeHook(options.afterEnter) ?? existing.afterEnter,
  };

  return {
    kind: 'defined-frame',
    id,
    view: frameView,
    address: options.address,
    outlets: normalizeFrameOutlets(options.outlets),
    paramsSchema: options.params ?? options.paramsSchema,
    querySchema: options.query ?? options.querySchema,
    transitions: options.transitions,
    directEntry: options.directEntry,
    directEntryRedirectTo: options.directEntryRedirectTo,
    providers: options.providers,
    policy: options.policy,
  } as FrameDefinition<
    TId,
    TParamsSchema,
    TQuerySchema,
    FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>>
  >;
}

export function address<
  const TPath extends string,
  const TFrame extends
    FrameDefinition<any, any, any>,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  frame: TFrame,
  options: AddressOptions<
    TFrame['id'],
    TParamsSchema,
    TQuerySchema
  > = {},
): AddressDefinition<
  TPath,
  TFrame,
  TParamsSchema,
  TQuerySchema
> {
  return {
    kind: 'address',
    path,
    frame,
    ...options,
  };
}

export function route<
  const TPath extends string,
  const TName extends
    string | undefined = undefined,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  component: Type<unknown>,
  options?: RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  >,
): RenderableRoute<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema
>;
export function route<
  const TPath extends string,
  const TFrame extends
    FrameDefinition<any, any, any>,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  frame: TFrame,
  options?: AddressOptions<
    TFrame['id'],
    TParamsSchema,
    TQuerySchema
  >,
): AddressDefinition<
  TPath,
  TFrame,
  TParamsSchema,
  TQuerySchema
>;
export function route<
  const TPath extends string,
  const TName extends
    string | undefined = undefined,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
  const TFrame extends FrameView<any> = FrameView<any>,
>(
  path: TPath,
  component: TFrame,
  options?: RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  >,
): RenderableRoute<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema,
  TFrame
>;
export function route<
  const TPath extends string,
  const TName extends
    string | undefined = undefined,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  component: Type<unknown> | FrameView | FrameDefinition,
  options:
    | RouteOptions<
        TName,
        TParamsSchema,
        TQuerySchema
      >
    | AddressOptions<
        string,
        TParamsSchema,
        TQuerySchema
      > = {},
): RenderableRoute<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema
> | AddressDefinition<
  TPath,
  FrameDefinition<any, any, any>,
  TParamsSchema,
  TQuerySchema
> {
  if (isDefinedFrame(component)) {
    return address(
      path,
      component,
      options,
    );
  }

  const route: RenderableRoute<
    TPath,
    TName,
    TParamsSchema,
    TQuerySchema
  > = {
    kind: 'route',
    path,
    ...createViewRecord(component),
    ...options,
  };

  return route;
}

export function lazyRoute<
  const TPath extends string,
  const TName extends
    string | undefined = undefined,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  loadComponent: Lazy<Type<unknown>>,
  options?: RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  >,
): RenderableRoute<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema
>;
export function lazyRoute<
  const TPath extends string,
  const TName extends
    string | undefined = undefined,
  const TParamsSchema extends
    ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends
    QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  loadComponent: Lazy<Type<unknown>> | FrameView,
  options: RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  > = {},
): RenderableRoute<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema
> {
  const route: RenderableRoute<
    TPath,
    TName,
    TParamsSchema,
    TQuerySchema
  > = {
    kind: 'route',
    path,
    ...createLazyViewRecord(loadComponent),
    ...options,
  };

  return route;
}

export function redirectRoute<
  const TPath extends string,
  const TRedirectTo extends string,
  const TName extends
    string | undefined = undefined,
>(
  path: TPath,
  redirectTo: TRedirectTo,
  options: Omit<
    RouteOptions<TName, undefined, undefined>,
    'redirectTo' | 'paramsSchema' | 'querySchema' | 'outlet'
  > = {},
): RedirectRouteDefinition<
  TPath,
  TName
> {
  return {
    kind: 'redirect',
    path,
    redirectTo,
    ...options,
  };
}

/** Preferred redirect builder. */
export const redirect = redirectRoute;

export function layout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  component: Type<unknown>,
  entries: TEntries,
  options?: LayoutOptions,
): LayoutDefinition<TPath, TEntries, undefined>;
export function layout<
  const TPath extends string,
  const TEntries extends NavigationTree,
  const TFrame extends FrameView<any>,
>(
  path: TPath,
  component: TFrame,
  entries: TEntries,
  options?: LayoutOptions,
): LayoutDefinition<TPath, TEntries, TFrame>;
export function layout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  component: Type<unknown> | FrameView<any>,
  entries: TEntries,
  options: LayoutOptions = {},
): LayoutDefinition<TPath, TEntries, any> {
  return {
    kind: 'layout',
    path,
    ...createViewRecord(component),
    entries,
    ...options,
  };
}

export function lazyLayout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  loadComponent: Lazy<Type<unknown>>,
  entries: TEntries,
  options?: LayoutOptions,
): LayoutDefinition<
  TPath,
  TEntries
>;
export function lazyLayout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  loadComponent: FrameView,
  entries: TEntries,
  options?: LayoutOptions,
): LayoutDefinition<
  TPath,
  TEntries
>;
export function lazyLayout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  loadComponent: Lazy<Type<unknown>> | FrameView,
  entries: TEntries,
  options: LayoutOptions = {},
): LayoutDefinition<
  TPath,
  TEntries
> {
  const layout: LayoutDefinition<
    TPath,
    TEntries
  > = {
    kind: 'layout',
    path,
    ...createLazyViewRecord(loadComponent),
    entries,
    ...options,
  };

  return layout;
}

export function navigation<
  const TFrames extends
    readonly FrameDefinition<any, any, any>[],
  const TEntries extends NavigationTree,
>(
  definition: {
    readonly frames: TFrames;
    readonly entries: TEntries;
  },
): NavigationDefinition<
  TFrames,
  TEntries
> {
  return {
    kind: 'navigation',
    frames: definition.frames,
    entries: definition.entries,
  };
}