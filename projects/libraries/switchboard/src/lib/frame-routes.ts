import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import { route } from './route-builders';
import type {
  StreamixAddress,
  StreamixFrameNavigationOptions,
  StreamixFrame,
  StreamixFrameRoute,
  StreamixFrameOutlet,
  StreamixRouteOptions,
  StreamixRoutes,
} from './route-types';

export function frameOutlet<
  const TOutlet extends string,
>(
  outlet: TOutlet,
  view: StreamixFrameOutlet<TOutlet>['view'],
): StreamixFrameOutlet<TOutlet> {
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
  view: StreamixFrame,
  options: StreamixRouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  > = {},
  outlets: readonly StreamixFrameOutlet[] = [],
): StreamixFrameRoute<
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
  definition: StreamixFrameRoute,
): StreamixRoutes {
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
  definition: StreamixAddress,
): StreamixRoutes {
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
    transitions,
    directEntry,
    directEntryRedirectTo,
  } = frame;
  const frameNavigation:
    StreamixFrameNavigationOptions | undefined =
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
    }),
    frameId: id,
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
