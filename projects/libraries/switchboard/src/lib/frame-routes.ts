import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import { route } from './route-builders';
import type {
  AddressDefinition,
  FrameDefinition,
  FrameNavigationOptions,
  FrameView,
  FrameRouteDefinition,
  FrameOutlet,
  RouteOptions,
  NavigationTree,
} from './navigation-definitions';

export function frameOutlet<
  const TOutlet extends string,
>(
  outlet: TOutlet,
  view: FrameOutlet<TOutlet>['view'],
): FrameOutlet<TOutlet> {
  return {
    outlet,
    view,
  };
}

export function frameRoute<
  const TPath extends string,
  const TName extends string | undefined = undefined,
  const TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  view: FrameView,
  options: RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  > = {},
  outlets: readonly FrameOutlet[] = [],
): FrameRouteDefinition<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema
> {
  return {
    kind: 'frame-route',
    path,
    view,
    ...options,
    outlets,
  };
}

export function buildFrameRoutes(
  definition: FrameRouteDefinition,
): NavigationTree {
  const {
    kind: _kind,
    path,
    view,
    outlets,
    ...options
  } = definition;

  return [
    route(
      path,
      view,
      options,
    ),
    ...(outlets ?? []).map(outlet =>
      route(path, outlet.view, {
        outlet: outlet.outlet,
      }),
    ),
  ];
}

export function buildAddressRoutes(
  definition: AddressDefinition,
): NavigationTree {
  const {
    path,
    frame,
    kind: _kind,
    ...options
  } = definition;
  const {
    id,
    view,
    outlets,
    paramsSchema,
    querySchema,
    transitions,
    directEntry,
    directEntryRedirectTo,
  } = frame;
  const frameNavigation:
    FrameNavigationOptions | undefined =
      transitions !== undefined
        || directEntry !== undefined
        || directEntryRedirectTo !== undefined
        ? {
            transitions,
            directEntry,
            directEntryRedirectTo,
          }
        : undefined;
  const primaryRoute = {
    ...route(path, view, {
      ...options,
      name: id,
      paramsSchema:
        options.paramsSchema
        ?? paramsSchema,
      querySchema:
        options.querySchema
        ?? querySchema,
    }),
    frameNavigation,
  };

  return [
    primaryRoute,
    ...(outlets ?? []).map(outlet =>
      route(path, outlet.view, {
        outlet: outlet.outlet,
      }),
    ),
  ];
}

export function buildInternalFrameRoutes(
  definition: FrameDefinition,
  path: string,
): NavigationTree {
  const {
    id,
    view,
    outlets,
    paramsSchema,
    querySchema,
    transitions,
    directEntry,
    directEntryRedirectTo,
  } = definition;
  const frameNavigation:
    FrameNavigationOptions | undefined =
      transitions !== undefined
        || directEntry !== undefined
        || directEntryRedirectTo !== undefined
        ? {
            transitions,
            directEntry,
            directEntryRedirectTo,
          }
        : undefined;

  const primaryRoute = {
    ...route(path, view, {
      name: id,
      paramsSchema,
      querySchema,
    }),
    frameNavigation,
  };

  return [
    primaryRoute,
    ...(outlets ?? []).map(outlet =>
      route(path, outlet.view, {
        outlet: outlet.outlet,
      }),
    ),
  ];
}

export {
  frameOutlet as defineFrameOutlet,
  frameRoute as defineFrameRoute,
};

