import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import type {
  FrameNavigationTarget,
  NamedNavigationTarget,
} from './navigation-targets';
import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import type {
  ActivatedRoute,
  DeactivationContext,
  NavigationContext,
  RouteData,
} from './vanilla-router';

export type MaybePromise<T> = T | PromiseLike<T>;
export type Lazy<T> = () => MaybePromise<T | { readonly default: T }>;

export type NavigationProvider = Provider | EnvironmentProviders;
export type NavigationProviders = readonly NavigationProvider[];

export type RouteRedirect = {
  readonly redirectTo:
    RedirectTarget;
  readonly replace?: boolean;
};

export type RedirectTarget =
  | string
  | URL
  | FrameNavigationTarget
  | NamedNavigationTarget;

export type GuardResult =
  | boolean
  | RedirectTarget
  | RouteRedirect;

export type CanEnterFn = (
  route: NavigationContext,
) => MaybePromise<GuardResult>;

export type CanLeaveFn = (
  route: DeactivationContext,
) => MaybePromise<GuardResult>;

export type FramePrepareResult = void | RouteData;

export type FramePrepareFn<
  TResult extends FramePrepareResult = FramePrepareResult,
> = (
  context: NavigationContext,
) => MaybePromise<TResult>;

type AwaitedPrepareResult<TPrepare> =
  TPrepare extends (...args: never[]) => infer TResult
    ? Exclude<Awaited<TResult>, void>
    : never;

type UnionToIntersection<T> =
  (T extends unknown ? (value: T) => void : never) extends
    (value: infer TIntersection) => void
      ? TIntersection
      : never;

type Simplify<T> = {
  readonly [TKey in keyof T]: T[TKey];
};

export type InferPreparedData<
  TPrepare extends readonly FramePrepareFn[] | undefined,
> = [TPrepare] extends [readonly FramePrepareFn[]]
  ? [AwaitedPrepareResult<TPrepare[number]>] extends [never]
    ? Readonly<Record<string, never>>
    : Simplify<UnionToIntersection<AwaitedPrepareResult<TPrepare[number]>>>
  : Readonly<Record<string, never>>;

export type FrameAfterEnterFn<
  TData extends RouteData = RouteData,
> = (
  route: ActivatedRoute<TData>,
) => MaybePromise<void>;

export type FrameBeforeLeaveFn<
  TData extends RouteData = RouteData,
> = (
  route: DeactivationContext<TData>,
) => MaybePromise<GuardResult>;

export interface FrameHooks<
  TPrepare extends readonly FramePrepareFn[] | undefined =
    readonly FramePrepareFn[] | undefined,
> {
  readonly beforeEnter?: readonly CanEnterFn[];
  readonly beforeLeave?: readonly FrameBeforeLeaveFn<InferPreparedData<TPrepare>>[];
  readonly prepare?: TPrepare;
  readonly afterEnter?: readonly FrameAfterEnterFn<InferPreparedData<TPrepare>>[];
}

export interface FrameNavigationOptions {
  readonly transitions?: readonly string[];
  readonly directEntry?: boolean;
  readonly directEntryRedirectTo?:
    NamedNavigationTarget;
}

export interface EagerViewDefinition {
  readonly component: Type<unknown>;
  readonly loadComponent?: never;
}

export interface LazyViewDefinition {
  readonly component?: never;
  readonly loadComponent: Lazy<Type<unknown>>;
}

export type ViewDefinition =
  | EagerViewDefinition
  | LazyViewDefinition;

export type FrameView<
  TData extends RouteData = RouteData,
> = ViewDefinition & {
  readonly kind: 'frame';
  readonly beforeEnter?: readonly CanEnterFn[];
  readonly beforeLeave?: readonly FrameBeforeLeaveFn<TData>[];
  readonly prepare?: readonly FramePrepareFn[];
  readonly afterEnter?: readonly FrameAfterEnterFn<TData>[];
};

export type InferFrameData<TFrame> =
  TFrame extends FrameView<infer TData>
    ? TData
    : Readonly<Record<string, never>>;

export interface RouteDefinitionBase<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> {
  readonly kind: 'route';
  readonly path: TPath;
  readonly name?: TName;
  readonly outlet?: string;
  readonly preload?: boolean;
  readonly viewTransition?: boolean;
  readonly paramsSchema?: TParamsSchema;
  readonly querySchema?: TQuerySchema;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly providers?: NavigationProviders;
}

export type RouteOptions<
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> = Omit<
  RouteDefinitionBase<
    string,
    TName,
    TParamsSchema,
    TQuerySchema
  >,
  'kind' | 'path'
>;

export interface FrameDefinitionOptions
<
  TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = undefined,
> extends FrameNavigationOptions {
  readonly paramsSchema?: TParamsSchema;
  readonly querySchema?: TQuerySchema;
  readonly outlets?: readonly FrameOutlet[];
}

export interface FrameOutlet<
  TOutlet extends string = string,
  TView extends FrameView<any> = FrameView<any>,
> {
  readonly outlet: TOutlet;
  readonly view: TView;
}

export interface FrameDefinition<
  TId extends string = string,
  TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = undefined,
  TView extends FrameView<any> = FrameView<any>,
> extends FrameDefinitionOptions<
    TParamsSchema,
    TQuerySchema
  > {
  readonly kind: 'defined-frame';
  readonly id: TId;
  readonly view: TView;
}

export type AddressOptions<
  TName extends string = string,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> = Omit<
  RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  >,
  'name' | 'outlet'
>;

export interface AddressDefinition<
  TPath extends string = string,
  TFrame extends FrameDefinition<any, any, any, any> = FrameDefinition<any, any, any, any>,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> extends AddressOptions<
    TFrame['id'],
    TParamsSchema,
    TQuerySchema
  > {
  readonly kind: 'address';
  readonly path: TPath;
  readonly frame: TFrame;
}

export interface FrameRouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
  TView extends FrameView<any> = FrameView<any>,
> extends RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  > {
  readonly kind: 'frame-route';
  readonly path: TPath;
  readonly view: TView;
  readonly outlets?: readonly FrameOutlet[];
}

export type RedirectRouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
> = Omit<
  RouteDefinitionBase<TPath, TName, undefined, undefined>,
  'kind' | 'outlet' | 'preload' | 'viewTransition' |
  'paramsSchema' | 'querySchema' | 'data' | 'providers'
> & {
  readonly kind: 'redirect';
  readonly redirectTo: string;
};

export type RenderableRoute<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
  TFrame extends FrameView<any> | undefined = FrameView<any> | undefined,
> =
  RouteDefinitionBase<
    TPath,
    TName,
    TParamsSchema,
    TQuerySchema
  > &
  ViewDefinition & {
  readonly frame?: TFrame;
  readonly frameNavigation?: FrameNavigationOptions;
  readonly redirectTo?: undefined;
};

export type RouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
  TFrame extends FrameView<any> | undefined = FrameView<any> | undefined,
> =
  | RedirectRouteDefinition<
      TPath,
      TName
    >
  | RenderableRoute<
      TPath,
      TName,
      TParamsSchema,
      TQuerySchema,
      TFrame
    >;

export type InferRoutePreparedData<TRoute> =
  TRoute extends RenderableRoute<string, string | undefined, any, any, infer TFrame>
    ? TFrame extends FrameView<any>
      ? InferFrameData<TFrame>
      : Readonly<Record<string, never>>
    : Readonly<Record<string, never>>;

export interface LayoutDefinitionBase<
  TPath extends string = string,
  TEntries extends NavigationTree = NavigationTree,
> {
  readonly kind: 'layout';
  readonly path: TPath;
  readonly entries: TEntries;
  readonly providers?: NavigationProviders;
}

export type LayoutOptions = Omit<
  LayoutDefinitionBase,
  'kind' | 'path' | 'entries'
>;

export type LayoutDefinition<
  TPath extends string = string,
  TEntries extends NavigationTree = NavigationTree,
  TFrame extends FrameView<any> | undefined = FrameView<any> | undefined,
> =
  LayoutDefinitionBase<
    TPath,
    TEntries
  > &
  ViewDefinition & {
    readonly frame?: TFrame;
  };

// Any-instantiated route/layout primitives to avoid undefined-widening issues
export type AnyRouteDefinition = RouteDefinition<any, any, any, any>;
export type AnyLayoutDefinition = LayoutDefinition<any, any, any>;
export type AnyFrameDefinition = FrameDefinition<any, any, any, any>;
export type AnyAddressDefinition = AddressDefinition<any, any, any, any>;
export type AnyFrameRouteDefinition = FrameRouteDefinition<any, any, any, any, any>;

export type NavigationEntry =
  | AnyRouteDefinition
  | AnyLayoutDefinition
  | AnyAddressDefinition
  | AnyFrameDefinition
  | AnyFrameRouteDefinition;
export type NavigationTree = readonly NavigationEntry[];

export interface NavigationDefinition<
  TFrames extends readonly AnyFrameDefinition[] = readonly AnyFrameDefinition[],
  TEntries extends NavigationTree = NavigationTree,
> {
  readonly kind: 'navigation';
  readonly frames: TFrames;
  readonly entries: TEntries;
}

export type AnyNavigationDefinition =
  NavigationDefinition<any, any>;

export type NavigationSource =
  | NavigationTree
  | AnyNavigationDefinition;