import type {
  InferParamType,
  InferQueryInputType,
  ParamSchemaRecord,
  QuerySchemaRecord,
} from './query-schema';
import type {
  FrameView,
  LayoutDefinition,
  NavigationTree,
  RenderableRoute,
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
 * Recursively flattens nested frames into typed navigation leaves.
 */
export type LeafFrameDefinitions<
  TTree extends NavigationTree,
> =
  TTree[number] extends infer TEntry
    ? TEntry extends FrameView<any> & { readonly id: string; readonly path: string }
        ? TEntry | (
          TEntry extends { readonly layout: infer TLayout extends NavigationTree }
            ? LeafFrameDefinitions<TLayout>
            : never
        )
      : TEntry extends {
            kind: 'layout',
            layout: infer TLayout extends NavigationTree,
          }
            ? LeafFrameDefinitions<TLayout>
            : never
    : never;

type FrameName<TFrame> = TFrame extends FrameView<any> & { readonly id: infer TFrameId }
    ? Extract<TFrameId, string>
  : never;

/**
 * Extracts frame names safely across nested frames without deep recursion.
 */
export type ExtractFrameNames<
  TTree extends NavigationTree,
> =
  FrameName<LeafFrameDefinitions<TTree>>;

/**
 * Infers frame path parameter types from params or path template tokens.
 */
export type InferFrameParams<TFrame> =
  TFrame extends FrameView<any> & {
        readonly path: infer TPath extends string,
        readonly params?: infer TParamsSchema,
      }
        ? [TParamsSchema] extends [ParamSchemaRecord]
          ? InferParamType<TParamsSchema>
          : [ExtractPathParams<TPath>] extends [never]
            ? Record<string, never>
            : Record<ExtractPathParams<TPath>, string>
    : Record<string, unknown>;

export type InferFrameQueryInput<TFrame> =
  TFrame extends FrameView<any> & {
        readonly query?: infer TQuerySchema,
      }
        ? [TQuerySchema] extends [QuerySchemaRecord]
          ? InferQueryInputType<TQuerySchema>
          : Record<string, unknown>
    : Record<string, unknown>;

type HasRequiredParams<TRoute> =
  InferFrameParams<TRoute> extends infer TParams
    ? keyof TParams extends never
      ? false
      : TParams extends Record<string, never>
        ? false
        : true
    : false;

/**
 * Maps options (params, query, navigation state) for a target route name.
 */
export type FrameOptionsByName<
  TTree extends NavigationTree,
  TName extends string,
> = LeafFrameDefinitions<TTree> extends infer TRoute
  ? TRoute extends FrameView<any> & { readonly id: TName; readonly path: string }
    ? HasRequiredParams<TRoute> extends true
      ? {
          readonly params: InferFrameParams<TRoute>;
          readonly query?: InferFrameQueryInput<TRoute>;
          readonly state?: unknown;
          readonly replace?: boolean;
        }
      : {
          readonly params?: InferFrameParams<TRoute>;
          readonly query?: InferFrameQueryInput<TRoute>;
          readonly state?: unknown;
          readonly replace?: boolean;
        }
    : never
  : never;

/**
 * Legacy typed address proxy used by FrameRuntime during URL projection.
 */
export type TypedNavigate<
  TTree extends NavigationTree,
> = {
  [K in ExtractFrameNames<TTree>]: (
    options?: FrameOptionsByName<TTree, K>,
  ) => Promise<boolean>;
};

/**
 * Legacy typed href projection used by FrameRuntime.
 */
export type TypedHref<
  TTree extends NavigationTree,
> = {
  [K in ExtractFrameNames<TTree>]: (
    options?: FrameOptionsByName<TTree, K>,
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
    infer TLayout extends NavigationTree,
    infer TView extends FrameView<any> | undefined
  >
    ? NavigationPreparedDataFromTree<
        TLayout,
        TName,
        MergePrepared<TParent, FrameViewData<TView>>
      >
    : TEntry extends FrameView<any> & {
        readonly id: string;
        readonly path: string;
        readonly layout: infer TLayout extends NavigationTree;
      }
      ? TEntry['id'] extends TName
        ? MergePrepared<TParent, FrameViewData<TEntry>>
        : NavigationPreparedDataFromTree<
            TLayout,
            TName,
            MergePrepared<TParent, FrameViewData<TEntry>>
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
      : TEntry extends FrameView<any> & { readonly id: TName; readonly path: string }
        ? MergePrepared<TParent, FrameViewData<TEntry>>
      : never;

type NavigationPreparedDataFromTree<
  TTree extends NavigationTree,
  TName extends string,
  TParent = Readonly<Record<string, never>>,
> = EntryPreparedData<TTree[number], TName, TParent>;
