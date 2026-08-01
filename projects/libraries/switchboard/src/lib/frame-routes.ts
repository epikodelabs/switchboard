import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import { route } from './route-builders';
import type {
  StreamixFrame,
  StreamixRouteOptions,
  StreamixRoutes,
} from './route-types';

export interface FrameOutletDefinition<
  TOutlet extends string = string,
> {
  readonly outlet: TOutlet;
  readonly view: StreamixFrame;
}

export interface FrameRouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> {
  readonly path: TPath;
  readonly view: StreamixFrame;
  readonly options?: StreamixRouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  >;
  readonly outlets?: readonly FrameOutletDefinition[];
}

export function defineFrameOutlet<
  const TOutlet extends string,
>(
  outlet: TOutlet,
  view: StreamixFrame,
): FrameOutletDefinition<TOutlet> {
  return {
    outlet,
    view,
  };
}

export function defineFrameRoute<
  const TPath extends string,
  const TName extends string | undefined = undefined,
  const TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  view: StreamixFrame,
  options?: StreamixRouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  >,
  outlets: readonly FrameOutletDefinition[] = [],
): FrameRouteDefinition<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema
> {
  return {
    path,
    view,
    options,
    outlets,
  };
}

export function buildFrameRoutes(
  definition: FrameRouteDefinition,
): StreamixRoutes {
  return [
    route(
      definition.path,
      definition.view,
      definition.options,
    ),
    ...(definition.outlets ?? []).map(outlet =>
      route(definition.path, outlet.view, {
        outlet: outlet.outlet,
      }),
    ),
  ];
}
