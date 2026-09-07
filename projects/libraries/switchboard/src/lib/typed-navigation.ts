import type {
  InferParamType,
  InferQueryInputType,
  InferQueryType,
  ParamSchemaRecord,
  QuerySchemaRecord,
} from './query-schema';
import type {
  FrameView,
  LayoutDefinition,
  NavigationTree,
  RenderableRoute,
  RouteDefinition,
} from './navigation-definitions';

/**
 * Extracts named parameter tokens from path string templates (e.g. "/users/:id")
 */
export type ExtractPathParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Recursively flattens all routes and layout entries into a union of leaf routes.
 */
export type LeafRouteDefinitions<
  TTree extends NavigationTree,
> =
  TTree[number] extends infer TEntry
    ? TEntry extends { kind: 'route' }
      ? TEntry
      : TEntry extends {
            kind: 'layout',
            entries: infer TEntries extends NavigationTree,
          }
            ? LeafRouteDefinitions<TEntries>
            : never
    : never;

type RouteName<TRoute> = TRoute extends RouteDefinition<
  string,
  infer TName,
  ParamSchemaRecord | undefined,
  QuerySchemaRecord | undefined,
  any
>
  ? Extract<TName, string>
  : never;

/**
 * Extracts route names safely across layout entries without deep recursion.
 */
export type ExtractRouteNames<
  TTree extends NavigationTree,
> =
  RouteName<LeafRouteDefinitions<TTree>>;

/**
 * Infers route path parameter types from params or path template tokens.
 */
export type InferRouteParams<TRoute> =
  TRoute extends RouteDefinition<
    infer TPath extends string,
    string | undefined,
    infer TParamsSchema,
    QuerySchemaRecord | undefined
  >
    ? [TParamsSchema] extends [ParamSchemaRecord]
      ? InferParamType<TParamsSchema>
      : [ExtractPathParams<TPath>] extends [never]
        ? Record<string, never>
        : Record<ExtractPathParams<TPath>, string>
    : Record<string, unknown>;

/**
 * Infers route query parameter types from query schemas.
 */
export type InferRouteQuery<TRoute> =
  TRoute extends RouteDefinition<
    string,
    string | undefined,
    ParamSchemaRecord | undefined,
    infer TQuerySchema
  >
    ? [TQuerySchema] extends [QuerySchemaRecord]
      ? InferQueryType<TQuerySchema>
      : Record<string, unknown>
    : Record<string, unknown>;

export type InferRouteQueryInput<TRoute> =
  TRoute extends RouteDefinition<
    string,
    string | undefined,
    ParamSchemaRecord | undefined,
    infer TQuerySchema
  >
    ? [TQuerySchema] extends [QuerySchemaRecord]
      ? InferQueryInputType<TQuerySchema>
      : Record<string, unknown>
    : Record<string, unknown>;

type HasRequiredParams<TRoute> =
  InferRouteParams<TRoute> extends infer TParams
    ? keyof TParams extends never
      ? false
      : TParams extends Record<string, never>
        ? false
        : true
    : false;

/**
 * Maps options (params, query, navigation state) for a target route name.
 */
export type RouteOptionsByName<
  TTree extends NavigationTree,
  TName extends string,
> = LeafRouteDefinitions<TTree> extends infer TRoute
  ? TRoute extends RouteDefinition<string, TName, any, any, any>
    ? HasRequiredParams<TRoute> extends true
      ? {
          readonly params: InferRouteParams<TRoute>;
          readonly query?: InferRouteQueryInput<TRoute>;
          readonly state?: unknown;
          readonly replace?: boolean;
        }
      : {
          readonly params?: InferRouteParams<TRoute>;
          readonly query?: InferRouteQueryInput<TRoute>;
          readonly state?: unknown;
          readonly replace?: boolean;
        }
    : never
  : never;

/**
 * Strongly-typed navigation proxy for Router.
 */
export type TypedNavigate<
  TTree extends NavigationTree,
> = {
  [K in ExtractRouteNames<TTree>]: (
    options?: RouteOptionsByName<TTree, K>,
  ) => Promise<boolean>;
};

/**
 * Strongly-typed href generator proxy for Router.
 */
export type TypedHref<
  TTree extends NavigationTree,
> = {
  [K in ExtractRouteNames<TTree>]: (
    options?: RouteOptionsByName<TTree, K>,
  ) => string | null;
};

type FrameViewData<TView> =
  TView extends FrameView<infer TData extends import('./vanilla-router').RouteData>
    ? TData
    : Readonly<Record<string, never>>;

type MergePrepared<TLeft, TRight> = {
  readonly [TKey in keyof TLeft | keyof TRight]:
    TKey extends keyof TRight
      ? TRight[TKey]
      : TKey extends keyof TLeft
        ? TLeft[TKey]
        : never;
};

type EntryPreparedData<
  TEntry,
  TName extends string,
  TParent = Readonly<Record<string, never>>,
> =
  TEntry extends LayoutDefinition<
    string,
    infer TEntries extends NavigationTree,
    infer TView extends FrameView<any> | undefined
  >
    ? NavigationPreparedDataFromTree<
        TEntries,
        TName,
        MergePrepared<TParent, FrameViewData<TView>>
      >
    : TEntry extends RenderableRoute<
        string,
        infer TRouteName extends string | undefined,
        any,
        any,
        infer TFrame extends FrameView<any> | undefined
      >
      ? TRouteName extends TName
        ? MergePrepared<TParent, FrameViewData<TFrame>>
        : never
      : never;

type NavigationPreparedDataFromTree<
  TTree extends NavigationTree,
  TName extends string,
  TParent = Readonly<Record<string, never>>,
> = EntryPreparedData<TTree[number], TName, TParent>;
