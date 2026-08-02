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

export type FramePrepareResult =
  | void
  | RouteData;

export type FramePrepareFn = (
  context: NavigationContext,
) => MaybePromise<FramePrepareResult>;

export type FrameAfterEnterFn = (
  route: ActivatedRoute,
) => MaybePromise<void>;

export interface FrameHooks {
  readonly beforeEnter?: readonly CanEnterFn[];
  readonly beforeLeave?: readonly CanLeaveFn[];
  readonly prepare?: readonly FramePrepareFn[];
  readonly afterEnter?: readonly FrameAfterEnterFn[];
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

export type FrameView =
  ViewDefinition &
  FrameHooks & {
    readonly kind: 'frame';
  };

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
  readonly canActivate?: readonly CanEnterFn[];
  readonly canDeactivate?: readonly CanLeaveFn[];
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
> {
  readonly outlet: TOutlet;
  readonly view: FrameView;
}

export interface FrameDefinition<
  TId extends string = string,
  TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = undefined,
> extends FrameDefinitionOptions<
    TParamsSchema,
    TQuerySchema
  > {
  readonly kind: 'defined-frame';
  readonly id: TId;
  readonly view: FrameView;
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
  TFrame extends FrameDefinition<any, any, any> = FrameDefinition<any, any, any>,
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
> extends RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema
  > {
  readonly kind: 'frame-route';
  readonly path: TPath;
  readonly view: FrameView;
  readonly outlets?: readonly FrameOutlet[];
}

export interface RedirectRouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
> extends RouteDefinitionBase<
    TPath,
    TName,
    undefined,
    undefined
  > {
  readonly redirectTo: string;
}

export type RenderableRoute<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> =
  RouteDefinitionBase<
    TPath,
    TName,
    TParamsSchema,
    TQuerySchema
  > &
  ViewDefinition & {
  readonly frame?: FrameView;
  readonly frameNavigation?: FrameNavigationOptions;
  readonly redirectTo?: undefined;
};

export type RouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> =
  | RedirectRouteDefinition<
      TPath,
      TName
    >
  | RenderableRoute<
      TPath,
      TName,
      TParamsSchema,
      TQuerySchema
    >;

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
> =
  LayoutDefinitionBase<
    TPath,
    TEntries
  > &
  ViewDefinition & {
    readonly frame?: FrameView;
  };

// Any-instantiated route/layout primitives to avoid undefined-widening issues
export type AnyRouteDefinition = RouteDefinition<any, any, any, any>;
export type AnyLayoutDefinition = LayoutDefinition<any, any>;
export type AnyFrameDefinition = FrameDefinition<any, any, any>;
export type AnyAddressDefinition = AddressDefinition<any, any, any, any>;
export type AnyFrameRouteDefinition = FrameRouteDefinition<any, any, any, any>;

export type NavigationEntry =
  | AnyRouteDefinition
  | AnyLayoutDefinition
  | AnyAddressDefinition
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

