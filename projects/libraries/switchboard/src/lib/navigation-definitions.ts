import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import type {
  ActivatedRoute,
  DeactivationContext,
  GuardResult,
  NavigationContext,
  RouteData,
} from './vanilla-router';
import type { MaybePromise } from './adapter-utils';

export type { GuardResult };
export type { MaybePromise };

export type Lazy<T> = () => MaybePromise<T | { readonly default: T }>;
export type View = Type<unknown> | Lazy<Type<unknown>>;

export type NavigationProvider = Provider | EnvironmentProviders;
export type NavigationProviders = readonly NavigationProvider[];

export type NavigationPolicy = {
  readonly allowAnonymous?: boolean;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
};

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

export type CanEnterFn = (
  route: NavigationContext,
) => MaybePromise<GuardResult>;

export type CanLeaveFn = (
  route: DeactivationContext,
) => MaybePromise<GuardResult>;

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

export type HookInput<T> = T | readonly T[];
export type HookList<T> = readonly T[] | undefined;

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

export type FrameOutletView = Type<unknown> | FrameView<any>;

export interface FrameOutlet<
  TOutlet extends string = string,
  TView extends FrameView<any> = FrameView<any>,
> {
  readonly outlet: TOutlet;
  readonly view: TView;
}

/**
 * A frame wraps a view with identity, graph edges, and lifecycle behavior.
 * Frames authored through `frame(id, ...)` carry a stable id that doubles as
 * the placed route's name.
 */
export type FrameView<
  TData extends RouteData = RouteData,
> = ViewDefinition & {
  readonly kind: 'frame';
  readonly path?: string;
  readonly id?: string;
  readonly name?: string;
  readonly preload?: boolean;
  readonly viewTransition?: boolean;
  readonly params?: ParamSchemaRecord;
  readonly query?: QuerySchemaRecord;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly providers?: NavigationProviders;
  readonly transitions?: readonly string[];
  readonly directEntry?: boolean;
  readonly directEntryRedirectTo?: string;
  readonly outlets?: readonly FrameOutlet[];
  readonly children?: NavigationTree;
  readonly policy?: NavigationPolicy;
  readonly beforeEnter?: readonly CanEnterFn[];
  readonly beforeLeave?: readonly FrameBeforeLeaveFn<TData>[];
  readonly prepare?: readonly FramePrepareFn[];
  readonly afterEnter?: readonly FrameAfterEnterFn<TData>[];
};

export type InferFrameData<TFrame> =
  TFrame extends FrameView<infer TData>
    ? TData
    : Readonly<Record<string, never>>;

export type RedirectFrameDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
> = {
  readonly kind: 'redirect-frame';
  readonly path: TPath;
  readonly name?: TName;
  readonly targetFrameId: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly providers?: NavigationProviders;
  readonly policy?: NavigationPolicy;
};

export type RouteFrame<
  TData extends RouteData = RouteData,
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
> =
  | FrameView<TData>
  | RedirectFrameDefinition<TPath, TName>;

export interface FrameOptions<
  TPrepare extends HookInput<FramePrepareFn> | undefined =
    HookInput<FramePrepareFn> | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
> {
  readonly preload?: boolean;
  readonly viewTransition?: boolean;
  readonly params?: TParamsSchema;
  readonly query?: TQuerySchema;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly providers?: NavigationProviders;
  /** Frame-graph edges: which frame ids may follow this frame. */
  readonly transitions?: readonly string[];
  /** Whether cold URL entry is allowed. Omit for graph-internal frames. */
  readonly directEntry?: boolean;
  /** Where a rejected cold entry should land instead. */
  readonly directEntryRedirectTo?: string;
  /** Companion views rendered beside the frame's primary outlet. */
  readonly outlets?: Readonly<Record<string, FrameOutletView>> | readonly FrameOutlet[];
  /** Child frames rendered inside this frame's primary outlet. */
  readonly children?: NavigationTree;
  readonly policy?: NavigationPolicy;
  readonly beforeEnter?: HookInput<CanEnterFn>;
  readonly beforeLeave?: HookInput<FrameBeforeLeaveFn<any>>;
  readonly prepare?: TPrepare;
  readonly afterEnter?: HookInput<FrameAfterEnterFn<any>>;
}

export interface RouteDefinitionBase<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
  TPrepare extends HookInput<FramePrepareFn> | undefined = HookInput<FramePrepareFn> | undefined,
> {
  readonly kind: 'route';
  readonly path: TPath;
  readonly name?: TName;
  readonly outlet?: string;
  readonly preload?: boolean;
  readonly viewTransition?: boolean;
  readonly params?: TParamsSchema;
  readonly query?: TQuerySchema;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly providers?: NavigationProviders;
  readonly policy?: NavigationPolicy;
  readonly beforeEnter?: HookInput<CanEnterFn>;
  readonly beforeLeave?: HookInput<FrameBeforeLeaveFn<any>>;
  readonly prepare?: TPrepare;
  readonly afterEnter?: HookInput<FrameAfterEnterFn<any>>;
}

export type RouteOptions<
  TName extends string | undefined = string | undefined,
  TParamsSchema extends ParamSchemaRecord | undefined = ParamSchemaRecord | undefined,
  TQuerySchema extends QuerySchemaRecord | undefined = QuerySchemaRecord | undefined,
  TPrepare extends HookInput<FramePrepareFn> | undefined = HookInput<FramePrepareFn> | undefined,
> = Omit<
  RouteDefinitionBase<
    string,
    TName,
    TParamsSchema,
    TQuerySchema,
    TPrepare
  >,
  'kind' | 'path'
>;

export type RedirectRouteDefinition<
  TPath extends string = string,
  TName extends string | undefined = string | undefined,
> = {
  readonly kind: 'route';
  readonly path: TPath;
  readonly name?: TName;
  readonly redirectTo: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly providers?: NavigationProviders;
  readonly policy?: NavigationPolicy;
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

export interface LayoutDefinitionBase<
  TPath extends string = string,
  TChildren extends NavigationTree = NavigationTree,
> {
  readonly kind: 'layout';
  readonly path: TPath;
  readonly children: TChildren;
  readonly providers?: NavigationProviders;
}

export type LayoutOptions = Omit<
  LayoutDefinitionBase,
  'kind' | 'path' | 'children'
>;

export type LayoutDefinition<
  TPath extends string = string,
  TChildren extends NavigationTree = NavigationTree,
  TFrame extends FrameView<any> | undefined = FrameView<any> | undefined,
> =
  LayoutDefinitionBase<
    TPath,
    TChildren
  > &
  ViewDefinition & {
  readonly frame?: TFrame;
};

// Any-instantiated route/layout primitives to avoid undefined-widening issues
export type AnyRouteDefinition = RouteDefinition<any, any, any, any, any>;
export type AnyLayoutDefinition = LayoutDefinition<any, any, any>;
export type AnyRouteFrame = RouteFrame<any, any, any>;

export interface FrameSlotDefinition<TSlotId extends string = string> {
  readonly kind: 'frame-slot';
  readonly slotId: TSlotId;
  /** Authored ownership edge. Protected-delivery builders may replace this import. */
  readonly load?: () => MaybePromise<FrameContributionDefinition<TSlotId>>;
}

export interface FrameContributionDefinition<
  TSlotId extends string = string,
  TId extends string = string,
  TChildren extends NavigationTree = NavigationTree,
> {
  readonly kind: 'frame-contribution';
  readonly slotId: TSlotId;
  /** @internal Runtime identity; compiler/server owned in protected-delivery builds. */
  readonly id: TId;
  readonly children: TChildren;
}

export type AnyFrameSlotDefinition = FrameSlotDefinition<any>;

export type NavigationEntry =
  | AnyRouteFrame
  | AnyLayoutDefinition
  | AnyFrameSlotDefinition;
export type NavigationTree = readonly NavigationEntry[];
