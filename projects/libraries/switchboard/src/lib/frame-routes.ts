import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import { route } from './route-builders';
import type {
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

export {
  frameOutlet as defineFrameOutlet,
  frameRoute as defineFrameRoute,
};
