import type {
  InferParamType,
  InferQueryInputType,
  InferQueryType,
  ParamSchemaRecord,
  QuerySchemaRecord,
} from './query-schema';
import type {
  AddressDefinition,
  FrameDefinition,
  FrameRouteDefinition,
  NavigationDefinition,
  NavigationSource,
  NavigationTree,
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

type FrameRouteAsLeaf<TRoute> =
  TRoute extends FrameRouteDefinition<
    infer TPath extends string,
    infer TName extends string | undefined,
    infer TParamsSchema,
    infer TQuerySchema
  >
    ? RouteDefinition<
        TPath,
        TName,
        TParamsSchema,
        TQuerySchema
      >
    : never;

type FrameParamsSchema<TFrame> =
  TFrame extends FrameDefinition<
    string,
    infer TParamsSchema,
    QuerySchemaRecord | undefined,
    any
  >
    ? TParamsSchema
    : undefined;

type FrameQuerySchema<TFrame> =
  TFrame extends FrameDefinition<
    string,
    ParamSchemaRecord | undefined,
    infer TQuerySchema,
    any
  >
    ? TQuerySchema
    : undefined;

type ResolveAddressParamsSchema<
  TFrame,
  TParamsSchema,
> =
  [TParamsSchema] extends [ParamSchemaRecord]
    ? TParamsSchema
    : FrameParamsSchema<TFrame>;

type ResolveAddressQuerySchema<
  TFrame,
  TQuerySchema,
> =
  [TQuerySchema] extends [QuerySchemaRecord]
    ? TQuerySchema
    : FrameQuerySchema<TFrame>;

type AddressAsLeaf<TAddress> =
  TAddress extends AddressDefinition<
    infer TPath extends string,
    infer TFrame,
    infer TParamsSchema,
    infer TQuerySchema
  >
    ? RouteDefinition<
        TPath,
        TFrame['id'],
        ResolveAddressParamsSchema<
          TFrame,
          TParamsSchema
        >,
        ResolveAddressQuerySchema<
          TFrame,
          TQuerySchema
        >
      >
    : never;

type ResolveNavigationEntries<
  TSource extends NavigationSource,
> =
  TSource extends NavigationDefinition<
    readonly FrameDefinition<any, any, any, any>[],
    infer TEntries
  >
    ? TEntries
    : TSource extends NavigationTree
      ? TSource
      : never;

/**
 * Recursively flattens all routes and layout entries into a union of leaf routes.
 */
export type LeafRouteDefinitions<
  TSource extends NavigationSource,
> =
  ResolveNavigationEntries<TSource>[number] extends infer TEntry
    ? TEntry extends { kind: 'route' }
      ? TEntry
      : TEntry extends { kind: 'address' }
        ? AddressAsLeaf<TEntry>
        : TEntry extends { kind: 'frame-route' }
          ? FrameRouteAsLeaf<TEntry>
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
  QuerySchemaRecord | undefined
>
  ? Extract<TName, string>
  : never;

/**
 * Extracts route names safely across layout entries without deep recursion.
 */
export type ExtractRouteNames<
  TSource extends NavigationSource,
> =
  RouteName<LeafRouteDefinitions<TSource>>;

/**
 * Infers route path parameter types from paramsSchema or path template tokens.
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
 * Infers route query parameter types from querySchema or searchSchema.
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
 * Maps options (params, query, search, navigation state) for a target route name.
 */
export type RouteOptionsByName<
  TSource extends NavigationSource,
  TName extends string,
> = LeafRouteDefinitions<TSource> extends infer TRoute
  ? TRoute extends RouteDefinition<string, TName, any, any>
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
  TSource extends NavigationSource,
> = {
  [K in ExtractRouteNames<TSource>]: (
    options?: RouteOptionsByName<TSource, K>,
  ) => Promise<boolean>;
};

/**
 * Strongly-typed href generator proxy for Router.
 */
export type TypedHref<
  TSource extends NavigationSource,
> = {
  [K in ExtractRouteNames<TSource>]: (
    options?: RouteOptionsByName<TSource, K>,
  ) => string | null;
};

type FrameViewData<TView> =
  TView extends import('./navigation-definitions').FrameView<infer TData extends import('./vanilla-router').RouteData>
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
  TEntry extends import('./navigation-definitions').LayoutDefinition<
    string,
    infer TEntries extends NavigationTree,
    infer TView extends import('./navigation-definitions').FrameView<any>
  >
    ? NavigationPreparedDataFromTree<
        TEntries,
        TName,
        MergePrepared<TParent, FrameViewData<TView>>
      >
    : TEntry extends import('./navigation-definitions').AddressDefinition<
        string,
        infer TFrame extends import('./navigation-definitions').FrameDefinition<any, any, any, any>,
        any,
        any
      >
      ? TFrame['id'] extends TName
        ? MergePrepared<TParent, FrameViewData<TFrame['view']>>
        : never
      : TEntry extends import('./navigation-definitions').FrameRouteDefinition<
          string,
          infer TRouteName extends string | undefined,
          any,
          any,
          any
        >
        ? TRouteName extends TName
          ? MergePrepared<TParent, FrameViewData<TEntry['view']>>
          : never
        : TEntry extends import('./navigation-definitions').RenderableRoute<
            string,
            infer TRouteName extends string | undefined,
            any,
            any,
            infer TFrame extends import('./navigation-definitions').FrameView<any>
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

export type InferNavigationPreparedData<
  TSource extends NavigationSource,
  TName extends ExtractRouteNames<TSource>,
> = NavigationPreparedDataFromTree<
  ResolveNavigationEntries<TSource>,
  TName
>;
