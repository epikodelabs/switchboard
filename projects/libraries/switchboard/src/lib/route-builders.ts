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
  LayoutDefinition,
  LayoutOptions,
  RedirectRouteDefinition,
  RenderableRoute,
  FrameOutlet,
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
  hooks: FrameHooks = {},
): FrameView {
  return {
    kind: 'frame',
    component,
    ...hooks,
  };
}

function normalizeFrameDefinitionOptions(
  options:
    FrameDefinitionOptions
    | undefined,
): FrameDefinitionOptions {
  return options ?? {};
}

export function lazyView(
  loadComponent: Lazy<Type<unknown>>,
  hooks: FrameHooks = {},
): FrameView {
  return {
    kind: 'frame',
    loadComponent,
    ...hooks,
  };
}

export function frame<
  const TId extends string,
>(
  id: TId,
  component: Type<unknown> | FrameView,
  options?: FrameDefinitionOptions,
): FrameDefinition<TId>;
export function frame<
  const TId extends string,
>(
  id: TId,
  component: Type<unknown> | FrameView,
  definition: FrameDefinitionOptions = {},
): FrameDefinition<TId> {
  const options =
    normalizeFrameDefinitionOptions(
      definition,
    );

  return {
    kind: 'defined-frame',
    id,
    view: createFrameDefinitionView(component),
    outlets: options.outlets ?? [],
    transitions: options.transitions,
    directEntry: options.directEntry,
    directEntryRedirectTo:
      options.directEntryRedirectTo,
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
  const TFrame extends FrameDefinition,
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
>(
  path: TPath,
  component: FrameView,
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
  FrameDefinition,
  TParamsSchema,
  TQuerySchema
> {
  if (isDefinedFrame(component)) {
    return {
      kind: 'address',
      path,
      frame: component,
      ...options,
    };
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
    kind: 'route',
    path,
    redirectTo,
    ...options,
  };
}

export function layout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  component: Type<unknown>,
  entries: TEntries,
  options?: LayoutOptions,
): LayoutDefinition<
  TPath,
  TEntries
>;
export function layout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  component: FrameView,
  entries: TEntries,
  options?: LayoutOptions,
): LayoutDefinition<
  TPath,
  TEntries
>;
export function layout<
  const TPath extends string,
  const TEntries extends NavigationTree,
>(
  path: TPath,
  component: Type<unknown> | FrameView,
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
    ...createViewRecord(component),
    entries,
    ...options,
  };

  return layout;
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

