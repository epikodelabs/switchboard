import { APP_BASE_HREF, DOCUMENT } from '@angular/common';

import {
  ApplicationRef,
  DestroyRef,
  EnvironmentInjector,
  InjectionToken,
  inject,
  runInInjectionContext,
  type Provider,
  type Type,
} from '@angular/core';

import {
  replaceChildNodes,
  runWithInjector,
  unwrapDefault,
} from './adapter-utils';

import {
  CompiledRouteGroup,
  compileFrameRoutes,
  type CompiledFrameRoutes,
} from './frame-compiler';

import {
  composeAngularLeafFrameView,
  composeAngularFrameView,
  type ResolvedFrameView,
} from './frame-renderer';

import type {
  FrameContributionDefinition,
  FramePrepareFn,
  MaybePromise,
  CanEnterFn,
  CanLeaveFn,
  FrameView,
  LayoutDefinition,
  NavigationTree,
  RenderableRoute,
  RedirectRouteDefinition,
  RouteDefinition,
} from './navigation-definitions';

import type { ServerFrameResolver } from './frame-delivery';
import {
  FRAME_RELAY_RUNTIME,
  type RelayInput,
  type RelayPath,
  type RelayTarget,
  type RelayRuntime,
} from './frame-relay';
import { FRAME_TREE, FrameTree, type FrameNode, type MaterializedNode } from './frame-tree';
import { resolveFrameSlots } from './frame-slots';

import { OUTLET_ACTIVATE_EVENT, dispatchOutletLifecycleEvent } from './frame-events';

import { compileRoutePath, matchRoutePath } from './route-path';

import {
  getRouterLocation as getNavigationLocation,
  resolveRouterUrl as resolveNavigationUrl,
  routerHref as navigationHref,
} from './router-url';

import {
  parseParamsRecord,
  parseQueryRecord,
  serializeParams,
  serializeQuery,
  type InferParamType,
  type InferQueryInputType,
  type ParamSchemaRecord,
  type QuerySchemaRecord,
} from './query-schema';

import {
  LoadedRoute,
  createRouter,
  type ActivatedRoute,
  type NavigationTransitionFn,
  type NavigationOptions,
  type NavigationTransitionDefinition,
  type PrepareRouteDataFn,
  type PreloadingStrategy,
  type Route,
  type RedirectRoute as RuntimeRedirectRoute,
  type RenderableRoute as RuntimeRenderableRoute,
  type RouteRenderContext,
  type Router as VanillaRouter,
  type RouterState,
  type ScrollRestorationMode,
  type ViewTransitionsOption,
} from './vanilla-router';

export type PathAddress = { readonly path: string | URL };
export type NamedFrameAddress<
  TName extends string = string,
  TParams = Record<string, unknown>,
  TQuery = Record<string, unknown>,
> = {
  readonly name: TName;
  readonly params?: TParams;
  readonly query?: TQuery;
};
export type FrameAddress = string | URL | PathAddress | NamedFrameAddress;

type ExtractPathParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type LeafFrames<TTree extends NavigationTree> =
  TTree[number] extends infer TEntry
    ? TEntry extends FrameView<any> & { readonly id: string; readonly path: string }
      ? TEntry | (TEntry extends { readonly layout: infer TLayout extends NavigationTree }
          ? LeafFrames<TLayout>
          : never)
      : TEntry extends { kind: 'layout'; layout: infer TLayout extends NavigationTree }
        ? LeafFrames<TLayout>
        : never
    : never;

type FrameId<TFrame> = TFrame extends FrameView<any> & { readonly id: infer TId }
  ? Extract<TId, string>
  : never;

type FrameIds<TTree extends NavigationTree> = FrameId<LeafFrames<TTree>>;

type FrameParams<TFrame> =
  TFrame extends FrameView<any> & {
    readonly path: infer TPath extends string;
    readonly params?: infer TParamsSchema;
  }
    ? [TParamsSchema] extends [ParamSchemaRecord]
      ? InferParamType<TParamsSchema>
      : [ExtractPathParams<TPath>] extends [never]
        ? Record<string, never>
        : Record<ExtractPathParams<TPath>, string>
    : Record<string, unknown>;

type FrameQuery<TFrame> =
  TFrame extends FrameView<any> & { readonly query?: infer TQuerySchema }
    ? [TQuerySchema] extends [QuerySchemaRecord]
      ? InferQueryInputType<TQuerySchema>
      : Record<string, unknown>
    : Record<string, unknown>;

type FrameAddressOptions<TTree extends NavigationTree, TId extends string> =
  LeafFrames<TTree> extends infer TFrame
    ? TFrame extends FrameView<any> & { readonly id: TId; readonly path: string }
      ? keyof FrameParams<TFrame> extends never
        ? { readonly params?: FrameParams<TFrame>; readonly query?: FrameQuery<TFrame>; readonly state?: unknown; readonly replace?: boolean }
        : FrameParams<TFrame> extends Record<string, never>
          ? { readonly params?: FrameParams<TFrame>; readonly query?: FrameQuery<TFrame>; readonly state?: unknown; readonly replace?: boolean }
          : { readonly params: FrameParams<TFrame>; readonly query?: FrameQuery<TFrame>; readonly state?: unknown; readonly replace?: boolean }
      : never
    : never;

type TypedNavigate<TTree extends NavigationTree> = {
  [K in FrameIds<TTree>]: (options?: FrameAddressOptions<TTree, K>) => Promise<boolean>;
};

type TypedHref<TTree extends NavigationTree> = {
  [K in FrameIds<TTree>]: (options?: FrameAddressOptions<TTree, K>) => string | null;
};

export interface FrameGraphOptions {
  readonly baseHref?: string;
  readonly enableTracing?: boolean;
  readonly maxRedirects?: number;
  readonly onSameUrlNavigation?: 'ignore';
  readonly scrollRestoration?: ScrollRestorationMode;
  readonly preloading?: PreloadingStrategy;
  readonly viewTransitions?: ViewTransitionsOption;
  /** Resolve and install server-authorized frame contributions on demand. */
  readonly resolveFrames?: ServerFrameResolver;
  /** Eager/local contributions installed before any server-delivered frames. */
  readonly contributions?: readonly FrameContributionDefinition[];
}

export const ROUTE = new InjectionToken<ActivatedRoute>('ROUTE');

export const ROUTE_CONTEXT = new InjectionToken<RouteRenderContext>('ROUTE_CONTEXT');

interface ResolvedNavigationInstruction {
  readonly matchTarget: string;
  readonly href: string | null;
}

interface FrameGraphConfiguration<
  TFrames extends NavigationTree = NavigationTree,
> extends FrameGraphOptions {
  readonly frames: TFrames;
}

const FRAME_GRAPH_CONFIGURATION = new InjectionToken<FrameGraphConfiguration>('FRAME_GRAPH_CONFIGURATION');


const EMPTY_ROUTER_STATE: RouterState = Object.freeze({
  current: null,
  pending: false,
  phase: null,
  error: null,
  path: '',
  params: Object.freeze({}),
  query: Object.freeze({}),
  data: Object.freeze({}),
  historyState: null,
  routeConfig: null,
});

const lazyComponents = new WeakMap<object, Promise<Type<unknown>>>();

function isRedirectRouteDefinition(
  route: RouteDefinition,
): route is RedirectRouteDefinition {
  return 'redirectTo' in route;
}

function loadComponent(owner: LayoutDefinition | RenderableRoute): Promise<Type<unknown>> {
  if (owner.component) {
    return Promise.resolve(owner.component);
  }

  if (!owner.loadComponent) {
    return Promise.reject(new Error('A frame view must define component or loadComponent.'));
  }

  let pending = lazyComponents.get(owner);

  if (!pending) {
    pending = Promise.resolve(owner.loadComponent())
      .then((value) =>
        unwrapDefault<Type<unknown>>(value as Type<unknown> | { readonly default: Type<unknown> }),
      )
      .then((component) => {
        if (!component) {
          throw new Error('Lazy component loader returned no component.');
        }

        return component;
      })
      .catch((error) => {
        lazyComponents.delete(owner);

        throw error;
      });

    lazyComponents.set(owner, pending);
  }

  return pending;
}

function snapshotRouterState(state: RouterState): RouterState {
  return Object.freeze({
    current: state.current ?? null,
    pending: state.pending ?? false,
    phase: state.phase ?? null,
    error: state.error ?? null,
    path: state.path ?? '',
    params: state.params ? Object.freeze({ ...state.params }) : Object.freeze({}),
    query: state.query ? Object.freeze({ ...state.query }) : Object.freeze({}),
    data: state.data ? Object.freeze({ ...state.data }) : Object.freeze({}),
    historyState: state.historyState ?? null,
    routeConfig: state.routeConfig ?? null,
  });
}

function execute<TContext, TResult>(
  injector: EnvironmentInjector,
  handler: (context: TContext) => MaybePromise<TResult>,
  context: TContext,
): Promise<TResult> {
  return runWithInjector(injector, handler, context);
}

function buildFrameAddressPath(
  compiled: CompiledFrameRoutes,
  target: NamedFrameAddress,
): string | null {
  const record = compiled.addresses.get(target.name);

  if (!record) {
    return null;
  }

  if (isRedirectRouteDefinition(record.route)) {
    return null;
  }

  const path = interpolateNamedPath(
    record.fullPath,
    target.params ?? {},
    record.route.params,
  );

  if (!path) {
    return null;
  }

  const query =
    record.route.query && target.query
      ? serializeQuery(record.route.query, target.query)
      : '';

  return `${path}${query}`;
}

function buildFrameNavigationPath(
  compiled: CompiledFrameRoutes,
  frameId: string,
  params: Readonly<Record<string, unknown>> = {},
  query: Readonly<Record<string, unknown>> | undefined,
): string | null {
  const record = compiled.addresses.get(frameId);
  if (!record || isRedirectRouteDefinition(record.route)) return null;

  const path = interpolateNamedPath(record.fullPath, params, record.route.params);
  if (!path) return null;

  const serializedQuery =
    record.route.query && query
      ? serializeQuery(record.route.query, query)
      : '';

  return `${path}${serializedQuery}`;
}

function adaptFrameBeforeEnter(
  handler: CanEnterFn,
  injector: EnvironmentInjector,
): NavigationTransitionFn {
  return async (transition) =>
    execute(injector, handler, {
      ...transition.to,
      signal: transition.signal,
    });
}

function adaptFrameBeforeLeave(
  handler: CanLeaveFn,
  injector: EnvironmentInjector,
): NavigationTransitionFn {
  return async (transition) => {
    if (!transition.from) {
      return true;
    }

    return execute(injector, handler, {
      ...transition.from,
      nextUrl: transition.to.url,
      signal: transition.signal,
    });
  };
}

function adaptFramePrepare(
  handler: FramePrepareFn,
  injector: EnvironmentInjector,
): PrepareRouteDataFn {
  return (route) => execute(injector, handler, route);
}

function adaptFrameAfterEnter(
  handler: (route: ActivatedRoute) => MaybePromise<void>,
  injector: EnvironmentInjector,
): NavigationTransitionFn {
  return (transition) => execute(injector, handler, transition.to);
}

function collectEnterFrames(
  layouts: readonly LayoutDefinition[],
  route: RenderableRoute,
): readonly FrameView[] {
  return Object.freeze([
    ...layouts.map((layout) => layout.frame).filter((frame): frame is FrameView => !!frame),
    ...(route.frame ? [route.frame] : []),
  ]);
}

function collectLeaveFrames(
  layouts: readonly LayoutDefinition[],
  route: RenderableRoute,
): readonly FrameView[] {
  const routeFrames = route.frame ? [route.frame] : [];
  const layoutFrames = layouts
    .map((layout) => layout.frame)
    .filter((frame): frame is FrameView => !!frame)
    .reverse();

  return Object.freeze([...routeFrames, ...layoutFrames]);
}

function adaptFramePreparers(
  frames: readonly FrameView[],
  injector: EnvironmentInjector,
): readonly PrepareRouteDataFn[] | undefined {
  const handlers = frames.flatMap(
    (frame) => frame.prepare?.map((handler) => adaptFramePrepare(handler, injector)) ?? [],
  );

  return handlers.length > 0 ? Object.freeze(handlers) : undefined;
}

function adaptFrameTransitions(
  groups: readonly CompiledRouteGroup[],
  injector: EnvironmentInjector,
): readonly NavigationTransitionDefinition[] {
  const transitions: NavigationTransitionDefinition[] = [];

  for (const group of groups) {
    const primaryRoute = group.primary.route;

    if (isRedirectRouteDefinition(primaryRoute)) {
      continue;
    }

    const renderableRoute = primaryRoute as RenderableRoute;
    const enterFrames = collectEnterFrames(group.primary.layouts, renderableRoute);
    const leaveFrames = collectLeaveFrames(group.primary.layouts, renderableRoute);

    for (const current of enterFrames) {
      if (!current.beforeEnter?.length && !current.afterEnter?.length) {
        continue;
      }

      transitions.push({
        to: (route) =>
          primaryRoute.name
            ? route?.config.name === primaryRoute.name
            : route?.config.sourceRoute === primaryRoute,
        beforeEnter: current.beforeEnter?.map((handler) =>
          adaptFrameBeforeEnter(handler, injector),
        ),
        afterEnter: current.afterEnter?.map((handler) => adaptFrameAfterEnter(handler, injector)),
      });
    }

    for (const current of leaveFrames) {
      if (!current.beforeLeave?.length) {
        continue;
      }

      transitions.push({
        from: (route) =>
          primaryRoute.name
            ? route?.config.name === primaryRoute.name
            : route?.config.sourceRoute === primaryRoute,
        beforeLeave: current.beforeLeave.map((handler) =>
          adaptFrameBeforeLeave(handler, injector),
        ),
      });
    }
  }

  return transitions;
}

function frameForActivatedRoute(route: ActivatedRoute | null): FrameView | null {
  const source = route?.config.sourceRoute as RouteDefinition | undefined;
  if (!source || isRedirectRouteDefinition(source)) return null;
  return source.frame ?? null;
}

function defaultDirectEntryPath(groups: readonly CompiledRouteGroup[]): string | null {
  for (const group of groups) {
    const route = group.primary.route;
    if (!isRedirectRouteDefinition(route) && route.frame?.directEntry === true) {
      return group.primary.path;
    }
  }
  return null;
}

function adaptFrameEntryTransitions(
  groups: readonly CompiledRouteGroup[],
): readonly NavigationTransitionDefinition[] {
  const defaultEntryPath = defaultDirectEntryPath(groups);

  return [
    {
      to: (route) => {
        const frame = frameForActivatedRoute(route);
        return !!frame && (
          frame.directEntry !== undefined
          || frame.directEntryRedirectTo !== undefined
        );
      },
      beforeEnter: [
        (transition) => {
          const targetFrame = frameForActivatedRoute(transition.to);
          if (!targetFrame?.id) return true;

          const enforceEntry =
            targetFrame.directEntry !== undefined
            || targetFrame.directEntryRedirectTo !== undefined;
          if (!enforceEntry) return true;

          // Entry policy is deliberately independent of Relay propagation.
          // Relay owns frame-to-frame reachability. Once Switchboard is already
          // active, an address navigation is an address operation, not a Relay hop.
          if (transition.from) return true;
          if (transition.redirectCount > 0) return true;
          if (targetFrame.directEntry) return true;

          const redirectTo = targetFrame.directEntryRedirectTo ?? defaultEntryPath;
          const targetPath = transition.to.url.pathname;
          if (!redirectTo || redirectTo === targetPath) return false;
          return { redirectTo, replace: true };
        },
      ],
    },
  ];
}

function adaptParamsParser(
  route: RenderableRoute,
  injector: EnvironmentInjector,
): LoadedRoute['parseParams'] {
  const schema = route.params;
  if (!schema) return undefined;

  return (params, _url, _signal) =>
    runInInjectionContext(injector, () =>
      Promise.resolve(
        parseParamsRecord(
          schema,
          params,
        ),
      ),
    );
}

function adaptQueryParser(
  route: RenderableRoute,
  injector: EnvironmentInjector,
): LoadedRoute['parseQuery'] {
  const schema = route.query;
  if (!schema) {
    return undefined;
  }

  return (url, _signal) =>
    runInInjectionContext(injector, () =>
      Promise.resolve(parseQueryRecord(schema, url)),
    );
}

async function resolveViews(
  layouts: readonly LayoutDefinition[],
  route: RenderableRoute,
): Promise<readonly ResolvedFrameView[]> {
  const resolvedLayouts = await Promise.all(
    layouts.map(async (layout, index) => ({
      component: await loadComponent(layout),
      providers: (layout.providers ?? []).flat().filter((p) => p),
      frameId: layout.frame?.id,
      transitions: layout.frame?.transitions,
      label: `LayoutDefinition(${layout.path || index})`,
    })),
  );

  const page = await loadComponent(route);

  return Object.freeze([
    ...resolvedLayouts,
    {
      component: page,
      providers: (route.providers ?? []).flat().filter((p) => p),
      frameId: route.frame?.id,
      transitions: route.frame?.transitions,
      label: `RouteDefinition(${route.path})`,
    },
  ]);
}

function adaptRoute(
  route: RedirectRouteDefinition,
  path: string,
  redirectTo: string | undefined,
  layouts: readonly LayoutDefinition[],
  sharedPreparers: readonly PrepareRouteDataFn[] | undefined,
  appRef: ApplicationRef,
  documentRef: Document,
  injector: EnvironmentInjector,
): RuntimeRedirectRoute;
function adaptRoute(
  route: RenderableRoute,
  path: string,
  redirectTo: string | undefined,
  layouts: readonly LayoutDefinition[],
  sharedPreparers: readonly PrepareRouteDataFn[] | undefined,
  appRef: ApplicationRef,
  documentRef: Document,
  injector: EnvironmentInjector,
): RuntimeRenderableRoute;
function adaptRoute(
  route: RouteDefinition,
  path: string,
  redirectTo: string | undefined,
  layouts: readonly LayoutDefinition[],
  sharedPreparers: readonly PrepareRouteDataFn[] | undefined,
  appRef: ApplicationRef,
  documentRef: Document,
  injector: EnvironmentInjector,
): Route;
function adaptRoute(
  route: RouteDefinition,
  path: string,
  redirectTo: string | undefined,
  layouts: readonly LayoutDefinition[],
  sharedPreparers: readonly PrepareRouteDataFn[] | undefined,
  appRef: ApplicationRef,
  documentRef: Document,
  injector: EnvironmentInjector,
): Route {
  if (isRedirectRouteDefinition(route)) {
    return {
      kind: 'redirect',
      name: route.name,
      path,
      sourceRoute: route,
      redirectTo: redirectTo ?? route.redirectTo,
    };
  }

  const tokens = {
    routeToken: ROUTE,
    contextToken: ROUTE_CONTEXT,
  } as const;

  return {
    kind: 'route',
    name: route.name,
    path,
    outlet: route.outlet,
    sourceRoute: route,
    data: route.data,
    preload: route.preload,
    viewTransition: route.viewTransition,
    load: async () => {
      const views = await resolveViews(layouts, route);
      return {
        component: route.outlet
          ? composeAngularLeafFrameView(appRef, documentRef, injector, tokens, views)
          : composeAngularFrameView(appRef, documentRef, injector, tokens, views),
        prepare: [
          ...(sharedPreparers ?? []),
          ...(adaptFramePreparers(route.frame ? [route.frame] : [], injector) ?? []),
        ],
        parseParams: adaptParamsParser(route, injector),
        parseQuery: adaptQueryParser(route, injector),
      };
    },
  };
}

function adaptRoutes(
  groups: readonly CompiledRouteGroup[],
  appRef: ApplicationRef,
  documentRef: Document,
  injector: EnvironmentInjector,
): Route[] {
  return groups.map(
    (group): Route => {
      const sharedPreparers = adaptFramePreparers(
        group.primary.layouts
          .map(layout => layout.frame)
          .filter(
            (frame): frame is FrameView<any> =>
              frame !== undefined,
          ),
        injector,
      );

      const authoredPrimary =
        group.primary.route;

      if (isRedirectRouteDefinition(authoredPrimary)) {
        return adaptRoute(
          authoredPrimary,
          group.primary.path,
          group.primary.redirectTo,
          group.primary.layouts,
          sharedPreparers,
          appRef,
          documentRef,
          injector,
        );
      }

      const primary = adaptRoute(
        authoredPrimary,
        group.primary.path,
        group.primary.redirectTo,
        group.primary.layouts,
        sharedPreparers,
        appRef,
        documentRef,
        injector,
      );

      if (group.outlets.length === 0) {
        return primary;
      }

      const outlets = group.outlets.map(
        (compiled): RuntimeRenderableRoute => {
          // validateRouteGroups guarantees outlet routes are renderable.
          const authoredOutlet =
            compiled.route as RenderableRoute;

          return adaptRoute(
            authoredOutlet,
            group.primary.path,
            compiled.redirectTo,
            group.primary.layouts,
            sharedPreparers,
            appRef,
            documentRef,
            injector,
          );
        },
      );

      return {
        kind: 'route',
        name: primary.name,
        path: primary.path,
        sourceRoute: primary.sourceRoute,
        data: primary.data,
        outlet: primary.outlet,
        load: primary.load,
        preload: primary.preload,
        viewTransition: primary.viewTransition,
        beforeEnter: primary.beforeEnter,
        beforeLeave: primary.beforeLeave,
        prepare: primary.prepare,
        outlets: Object.freeze(outlets),
      };
    },
  );
}

function interpolateNamedPath(
  template: string,
  params: Readonly<Record<string, unknown>>,
  schema: ParamSchemaRecord | undefined,
): string | null {
  const serialized = schema
    ? serializeParams(schema, params as unknown as InferParamType<ParamSchemaRecord>)
    : Object.fromEntries(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)]),
      );

  const missing = new Set<string>();

  const path = template.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => {
    const value = serialized[key];

    if (value === undefined) {
      missing.add(key);
      return `:${key}`;
    }

    return encodeURIComponent(value);
  });

  if (missing.size > 0) {
    return null;
  }

  return path;
}


export class FrameRuntime<TFrames extends NavigationTree = any> implements RelayRuntime {
  private readonly appRef: ApplicationRef;
  private readonly injector: EnvironmentInjector;
  private readonly destroyRef: DestroyRef;
  private readonly document: Document;
  private readonly appBaseHref: string;
  private readonly frameTree: FrameTree;
  private compiled: CompiledFrameRoutes;
  private addressPatterns: readonly ReturnType<typeof compileRoutePath>[] = [];
  private activeSource: NavigationTree;
  private readonly deliveredBySlot = new Map<string, FrameContributionDefinition>();
  private readonly contributionIdentities = new Map<string, string>();
  private readonly pendingFrameResolutions = new Map<string, Promise<boolean>>();
  private readonly unresolvedFrameTargets = new Set<string>();
  private startupTask: Promise<void> | null = null;
  private engine: VanillaRouter | null = null;
  private currentState: RouterState = EMPTY_ROUTER_STATE;
  private tickQueued = false;
  // VanillaRouter render targets remain a presentation concern. The materialized
  // FrameTree records every outlet for logical ownership, while this registry
  // exposes only application/named commit targets. Nested primary outlets are
  // composed by frame-renderer and must never compete as router commit targets.
  private readonly outlets = new Map<string, HTMLElement[]>();

  public readonly navigateTo: TypedNavigate<TFrames>;
  public readonly hrefTo: TypedHref<TFrames>;

  constructor(private readonly configuration: FrameGraphConfiguration<TFrames>) {
    this.appRef = inject(ApplicationRef);
    this.injector = inject(EnvironmentInjector);
    this.destroyRef = inject(DestroyRef);
    this.document = inject(DOCUMENT);
    this.frameTree = inject(FRAME_TREE);
    this.appBaseHref =
      inject(APP_BASE_HREF, {
        optional: true,
      }) ?? '/';

    for (const contribution of this.configuration.contributions ?? []) {
      this.deliveredBySlot.set(contribution.slotId, contribution);
    }
    this.activeSource = this.composeActiveSource();
    this.compiled = compileFrameRoutes(this.activeSource);
    this.addressPatterns = Object.freeze(
      this.compiled.groups.map(group => compileRoutePath(group.primary.path)),
    );
    this.navigateTo = this.createNavigateProxy();

    this.hrefTo = this.createHrefProxy();

    this.destroyRef.onDestroy(() => this.dispose());
  }

  get active(): boolean {
    return this.engine !== null;
  }

  get state(): RouterState {
    return this.currentState;
  }

  get displayUrl(): string {
    const location = getNavigationLocation(this.document);

    return `${location.pathname}${location.search}${location.hash}`;
  }

  connect(name: string, outlet: HTMLElement, owner: MaterializedNode | null = null): void {
    const outletName = name.trim();
    this.frameTree.registerOutlet(outletName, outlet, owner);

    // Primary outlets owned by a materialized frame/view scope are composition
    // slots, not router-level commit targets. composeAngularFrameView places
    // descendants into them while building the Angular view subtree. Root
    // primary and all named outlets remain addressable by VanillaRouter.
    if (outletName !== '' || owner === null) {
      const registered = this.outlets.get(outletName) ?? [];
      if (!registered.includes(outlet)) {
        registered.push(outlet);
        this.outlets.set(outletName, registered);
      }
    }

    if (this.engine || this.startupTask) return;
    this.startRouter();
  }

  private startRouter(): void {
    let task!: Promise<void>;

    task = Promise.resolve().then(async () => {
      const location = getNavigationLocation(this.document);
      const url = new URL(location.href);
      await this.resolveServerFrames(url);

      if (this.startupTask !== task || this.engine || this.frameTree.outletCount === 0) {
        return;
      }

      const engine = this.createEngine();
      try {
        engine.start();
      } catch (error) {
        engine.dispose();
        throw error;
      }

      if (this.startupTask !== task) {
        engine.dispose();
        return;
      }

      this.engine = engine;
      this.currentState = snapshotRouterState(engine.state);
      this.requestTick();
    });

    this.startupTask = task;
    void task
      .catch(error => {
        console.error('Switchboard frame navigation startup failed.', error);
        const target = this.getOutlet('');
        if (target) {
          const heading = this.document.createElement('h1');
          heading.textContent = 'Page failed to load';
          replaceChildNodes(target, heading);
        }
      })
      .finally(() => {
        if (this.startupTask === task) this.startupTask = null;
      });
  }

  private createEngine(): VanillaRouter {
    return createRouter({
      routes: adaptRoutes(this.compiled.groups, this.appRef, this.document, this.injector),

      baseHref: this.baseHref,

      enableTracing: this.configuration.enableTracing,

      maxRedirects: this.configuration.maxRedirects,

      onSameUrlNavigation: this.configuration.onSameUrlNavigation,

      scrollRestoration: this.configuration.scrollRestoration,

      preloading: this.configuration.preloading,

      transitions: [
        ...adaptFrameEntryTransitions(this.compiled.groups),
        ...adaptFrameTransitions(this.compiled.groups, this.injector),
      ],

      viewTransitions: this.configuration.viewTransitions,

      render: (targetName, node) => {
        const target = this.getOutlet(targetName, node);

        if (!target) {
          throw new Error(`Frame outlet "${targetName}" is not connected.`);
        }

        replaceChildNodes(target, node);
        this.frameTree.mountHost(node, target);
      },

      commit: (outlets) => {
        // Resolve the complete commit plan before mutating the DOM. Besides
        // making validation atomic, this prevents an earlier outlet mutation
        // from changing which later outlet instance wins resolution.
        const placements = outlets.map(outlet => {
          const target = this.getOutlet(outlet.name, outlet.node);
          if (!target) {
            throw new Error(`Frame outlet "${outlet.name}" is not connected.`);
          }
          return { outlet, target };
        });

        for (const { outlet, target } of placements) {
          replaceChildNodes(target, outlet.node);
          this.frameTree.mountHost(outlet.node, target);
          dispatchOutletLifecycleEvent(target, OUTLET_ACTIVATE_EVENT, outlet.component);
        }
      },

      renderNotFound: (targetName, _url, _router) => {
        const target = this.getOutlet(targetName);

        if (!target) {
          return;
        }

        const heading = this.document.createElement('h1');

        heading.textContent = '404 — Page Not Found';

        replaceChildNodes(target, heading);
      },

      renderError: (targetName, _error, _router) => {
        const target = this.getOutlet(targetName);

        if (!target) {
          return;
        }

        const heading = this.document.createElement('h1');

        heading.textContent = 'Page failed to load';

        replaceChildNodes(target, heading);
      },

      onStateChange: (state) => {
        this.currentState = snapshotRouterState(state);
        this.requestTick();
      },

      onOutletActivate: (target, component) => {
        dispatchOutletLifecycleEvent(target, OUTLET_ACTIVATE_EVENT, component);
      },
    });
  }

  disconnect(name: string, outlet: HTMLElement): void {
    this.frameTree.unregisterOutlet(outlet);

    const outletName = name.trim();
    const registered = this.outlets.get(outletName);
    if (registered) {
      const index = registered.indexOf(outlet);
      if (index >= 0) registered.splice(index, 1);
      if (registered.length === 0) this.outlets.delete(outletName);
    }

    if (this.outlets.size === 0) this.dispose();
  }


  resolve(origin: FrameNode, target: RelayTarget): RelayPath | null {
    const bubble = this.frameTree.bubble(origin);
    if (bubble.length === 0) return null;

    // Relay resolution is purely a materialized-tree operation. Whether the
    // accepted target currently has an address is a later projection concern
    // (and may change when server-delivered frames are installed).
    for (let index = 0; index < bubble.length; index++) {
      const candidate = bubble[index]!;
      const acceptsSelf = candidate.frameId === target.id;
      const acceptsPeer = candidate.transitions.includes(target.id);
      if (!acceptsSelf && !acceptsPeer) continue;
      return Object.freeze({
        origin,
        bubble: Object.freeze(bubble.slice(0, index + 1)),
        acceptedBy: candidate,
        targetFrameId: target.id,
      });
    }
    return null;
  }

  async send(
    origin: FrameNode,
    target: RelayTarget,
    input?: RelayInput,
  ): Promise<boolean> {
    let path = this.resolve(origin, target);
    let instruction = this.resolveRelayInstruction(target, input);
    if ((!path || !instruction) && this.configuration.resolveFrames) {
      const candidateUrl = instruction
        ? new URL(instruction.matchTarget, getNavigationLocation(this.document).origin)
        : null;
      if (candidateUrl && await this.resolveServerFrames(candidateUrl)) {
        path = this.resolve(origin, target);
        instruction = this.resolveRelayInstruction(target, input);
      }
    }
    if (!path || !instruction) return false;
    return await (await this.requireStartedEngine()).navigate(
      instruction.matchTarget,
      { replace: input?.replace, state: input?.state },
    );
  }

  link(origin: FrameNode, target: RelayTarget, input?: RelayInput): string | null {
    return this.resolve(origin, target)
      ? this.resolveRelayInstruction(target, input)?.href ?? null
      : null;
  }

  async navigate(target: FrameAddress, options?: NavigationOptions): Promise<boolean> {
    return this.navigateAddress(target, options);
  }

  href(target: FrameAddress): string | null {
    return this.hrefAddress(target);
  }

  private resolveRelayInstruction(
    target: RelayTarget,
    input: RelayInput | undefined,
  ): ResolvedNavigationInstruction | null {
    const path = buildFrameNavigationPath(
      this.compiled,
      target.id,
      input?.params ?? {},
      input?.query,
    );
    if (!path) return null;
    const href = this.resolveHref(path);
    return { matchTarget: href, href };
  }

  private async navigateAddress(target: FrameAddress, options?: NavigationOptions): Promise<boolean> {
    let instruction = this.resolveAddressInstruction(target);

    if (this.configuration.resolveFrames) {
      const candidateUrl = this.addressUrl(target, instruction);
      if (candidateUrl) {
        const changed = await this.resolveServerFrames(candidateUrl);
        if (changed) instruction = this.resolveAddressInstruction(target);
      }
    }

    if (!instruction) {
      return false;
    }

    return await (await this.requireStartedEngine()).navigate(
      instruction.matchTarget,
      { ...options },
    );
  }

  private hrefAddress(target: FrameAddress | null | undefined): string | null {
    if (target === null || target === undefined) {
      return null;
    }

    if (typeof target === 'string' || target instanceof URL) {
      return this.resolveHref(target);
    }

    if ('path' in target) {
      return this.resolveHref(target.path);
    }

    if ('name' in target) {
      return this.resolveAddressInstruction(target)?.href ?? null;
    }

    return null;
  }


  async revalidate(): Promise<boolean> {
    this.unresolvedFrameTargets.clear();
    return await (await this.requireStartedEngine()).revalidate();
  }

  updateHistoryState(state: unknown): void {
    this.requireEngine().updateHistoryState(state);
  }

  async preload(): Promise<void> {
    await (await this.requireStartedEngine()).preload();
  }

  dispose(): void {
    const engine = this.engine;

    this.startupTask = null;
    this.pendingFrameResolutions.clear();
    this.unresolvedFrameTargets.clear();
    this.engine = null;

    engine?.dispose();

    this.currentState = EMPTY_ROUTER_STATE;
  }

  private get baseHref(): string {
    return this.configuration.baseHref ?? this.appBaseHref;
  }

  private requireEngine(): VanillaRouter {
    if (!this.engine) {
      throw new Error('Frame navigator has no active outlet.');
    }

    return this.engine;
  }

  private resolveHref(target: string | URL): string {
    return navigationHref(
      resolveNavigationUrl(target, this.baseHref, getNavigationLocation(this.document), 'href'),
    );
  }

  private async requireStartedEngine(): Promise<VanillaRouter> {
    if (!this.engine && this.startupTask) {
      await this.startupTask;
    }
    return this.requireEngine();
  }

  private composeActiveSource(): NavigationTree {
    return resolveFrameSlots(
      this.configuration.frames,
      Object.freeze([...this.deliveredBySlot.values()]),
    );
  }

  private rebuildActiveGraph(): void {
    this.activeSource = this.composeActiveSource();
    this.compiled = compileFrameRoutes(this.activeSource);
    this.addressPatterns = Object.freeze(
      this.compiled.groups.map(group => compileRoutePath(group.primary.path)),
    );

    if (!this.engine) return;
    this.engine.replaceConfiguration({
      routes: adaptRoutes(
        this.compiled.groups,
        this.appRef,
        this.document,
        this.injector,
      ),
      transitions: [
        ...adaptFrameEntryTransitions(this.compiled.groups),
        ...adaptFrameTransitions(this.compiled.groups, this.injector),
      ],
    });
  }

  private async resolveServerFrames(url: URL): Promise<boolean> {
    const resolver = this.configuration.resolveFrames;
    if (!resolver) return false;

    const key = `${url.pathname}${url.search}${url.hash}`;
    if (this.addressMatchesPath(url.pathname) || this.unresolvedFrameTargets.has(key)) {
      return false;
    }

    const existing = this.pendingFrameResolutions.get(key);
    if (existing) return existing;

    const controller = new AbortController();
    let task!: Promise<boolean>;
    task = Promise.resolve(resolver(url, { signal: controller.signal }))
      .then(resolved => {
        if (!resolved) {
          this.unresolvedFrameTargets.add(key);
          return false;
        }

        let changed = false;
        for (const contribution of resolved.contributions) {
          const identity = resolved.contributionIdentities[contribution.slotId];
          const previousIdentity = this.contributionIdentities.get(contribution.slotId);
          if (identity && previousIdentity === identity) continue;

          this.deliveredBySlot.set(contribution.slotId, contribution);
          if (identity) this.contributionIdentities.set(contribution.slotId, identity);
          changed = true;
        }

        if (!changed) return false;
        this.unresolvedFrameTargets.delete(key);
        this.rebuildActiveGraph();
        return true;
      })
      .finally(() => {
        if (this.pendingFrameResolutions.get(key) === task) {
          this.pendingFrameResolutions.delete(key);
        }
      });

    this.pendingFrameResolutions.set(key, task);
    return task;
  }

  private addressMatchesPath(pathname: string): boolean {
    return this.addressPatterns.some(pattern =>
      matchRoutePath(pattern, pathname) !== null,
    );
  }

  private addressUrl(
    target: FrameAddress,
    instruction: ResolvedNavigationInstruction | null,
  ): URL | null {
    if (instruction) {
      return new URL(instruction.matchTarget, getNavigationLocation(this.document).origin);
    }
    if (typeof target === 'string' || target instanceof URL) {
      return resolveNavigationUrl(
        target,
        this.baseHref,
        getNavigationLocation(this.document),
        'href',
      );
    }
    if ('path' in target) {
      return resolveNavigationUrl(
        target.path,
        this.baseHref,
        getNavigationLocation(this.document),
        'href',
      );
    }
    return null;
  }

  private resolveAddressInstruction(
    target: FrameAddress,
  ): ResolvedNavigationInstruction | null {
    if (typeof target === 'string' || target instanceof URL) {
      const href = this.resolveHref(target);

      return {
        matchTarget: href,
        href,
      };
    }

    if ('path' in target) {
      const href = this.resolveHref(target.path);

      return {
        matchTarget: href,
        href,
      };
    }

    const path = buildFrameAddressPath(this.compiled, target);

    if (!path) {
      return null;
    }

    const href = this.resolveHref(path);

    return {
      matchTarget: href,
      href,
    };
  }

  private createNavigateProxy(): TypedNavigate<TFrames> {
    return new Proxy(Object.create(null), {
      get: (_target, property) => {
        if (typeof property !== 'string' || property === 'then') {
          return undefined;
        }

        return (options: Record<string, unknown> = {}) =>
          this.navigate(
            Object.assign(
              { name: property },
              options,
            ) as NamedFrameAddress,
          );
      },
    }) as TypedNavigate<TFrames>;
  }

  private createHrefProxy(): TypedHref<TFrames> {
    return new Proxy(Object.create(null), {
      get: (_target, property) => {
        if (typeof property !== 'string' || property === 'then') {
          return undefined;
        }

        return (options: Record<string, unknown> = {}) =>
          this.href(
            Object.assign(
              { name: property },
              options,
            ) as NamedFrameAddress,
          );
      },
    }) as TypedHref<TFrames>;
  }

  private getOutlet(name: string, incoming?: Node): HTMLElement | null {
    const outletName = name.trim();
    const registered = this.outlets.get(outletName);
    if (!registered?.length) return null;

    // FrameTree owns outlet lifetime. A branch can be removed from the logical
    // tree before Angular destroys its directives and calls disconnect(), so
    // prune router-target entries that the tree has already invalidated.
    for (let index = registered.length - 1; index >= 0; index--) {
      if (!this.frameTree.hasOutlet(registered[index]!)) registered.splice(index, 1);
    }
    if (registered.length === 0) {
      this.outlets.delete(outletName);
      return null;
    }

    // Angular may connect outlets contained by an incoming composed frame
    // before VanillaRouter commits that frame. Such an outlet can never be a
    // legal destination for the node that contains it. Keep router-target
    // selection independent from FrameTree ownership, but enforce this DOM
    // invariant at the final placement boundary.
    if (incoming?.nodeType === 1) {
      const incomingElement = incoming as Element;
      for (let index = registered.length - 1; index >= 0; index--) {
        const candidate = registered[index]!;
        if (!incomingElement.contains(candidate)) return candidate;
      }
      return null;
    }

    return registered[registered.length - 1] ?? null;
  }

  private requestTick(): void {
    if (this.tickQueued) {
      return;
    }

    this.tickQueued = true;

    queueMicrotask(() => {
      this.tickQueued = false;

      if (!this.engine) {
        return;
      }

      this.appRef.tick();
    });
  }
}

export function provideFrameGraph<const TFrames extends NavigationTree>(
  frames: TFrames,
  options: FrameGraphOptions = {},
): Provider[] {
  const config: FrameGraphConfiguration<TFrames> = {
    ...options,
    frames,
  };

  return [
    {
      provide: FRAME_GRAPH_CONFIGURATION,
      useValue: config,
    },
    { provide: FRAME_TREE, useFactory: () => new FrameTree() },
    {
      provide: FrameRuntime,
      useFactory: (configuration: FrameGraphConfiguration<TFrames>) =>
        new FrameRuntime<TFrames>(configuration),
      deps: [FRAME_GRAPH_CONFIGURATION],
    },
    {
      provide: FRAME_RELAY_RUNTIME,
      useExisting: FrameRuntime,
    },
  ];
}

export const provideServerFrameGraph = provideFrameGraph;