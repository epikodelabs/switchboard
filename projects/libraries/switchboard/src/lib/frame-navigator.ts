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

import type {
  NamedNavigationTarget,
  NavigationTarget,
} from './navigation-targets';

import {
  CompiledRouteGroup,
  createRouteRegistry,
  type FrameRouteRegistry,
  type FrameRouteRegistryRecord,
  type RouteRegistry,
} from './route-compiler';

import {
  composeAngularLeafRouteView,
  composeAngularRouteView,
  type ResolvedRouteView,
} from './route-renderer';

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

import type { TypedHref, TypedNavigate } from './typed-navigation';

import type { ServerFrameResolver } from './frame-delivery';
import { resolveFrameSlots } from './frame-slots';

import { OUTLET_ACTIVATE_EVENT, dispatchOutletLifecycleEvent } from './router-events';

import { compileRoutePath, matchRoutePath } from './route-path';

import { getRouterLocation, resolveRouterUrl, routerHref } from './router-url';

import {
  parseParamsRecord,
  parseQueryRecord,
  serializeParams,
  serializeQuery,
  type InferParamType,
  type ParamSchemaRecord,
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
    return Promise.reject(new Error('A route view must define component or loadComponent.'));
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

function buildNamedNavigationPath(
  registry: RouteRegistry,
  target: NamedNavigationTarget,
): string | null {
  const record = registry.namedRoutes.get(target.name);

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

function resolveFrameRouteRecord(
  frames: FrameRouteRegistry,
  route: ActivatedRoute | null,
): FrameRouteRegistryRecord | null {
  const frameId = route?.config.name;

  if (frameId && frames.byId.has(frameId)) {
    return frames.byId.get(frameId) ?? null;
  }

  return null;
}

function adaptFrameGraphTransitions(
  registry: RouteRegistry,
): readonly NavigationTransitionDefinition[] {
  const { frames } = registry;

  if (frames.byId.size === 0) {
    return [];
  }

  return [
    {
      to: (route) => !!resolveFrameRouteRecord(frames, route)?.enforceGraph,
      beforeEnter: [
        (transition) => {
          const targetFrame = resolveFrameRouteRecord(frames, transition.to);

          if (!targetFrame?.enforceGraph) {
            return true;
          }

          const sourceFrame = resolveFrameRouteRecord(frames, transition.from);

          if (sourceFrame && sourceFrame.frameId === targetFrame.frameId) {
            return true;
          }

          if (sourceFrame?.transitions.includes(targetFrame.frameId)) {
            return true;
          }

          if (!sourceFrame && transition.redirectCount > 0) {
            return true;
          }

          if (targetFrame.directEntry) {
            return true;
          }

          const redirectTo = targetFrame.directEntryRedirectTo
            ?? frames.defaultEntryPath;

          if (!redirectTo || redirectTo === targetFrame.matchPath) {
            return false;
          }

          return {
            redirectTo,
            replace: true,
          };
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
): Promise<readonly ResolvedRouteView[]> {
  const resolvedLayouts = await Promise.all(
    layouts.map(async (layout, index) => ({
      component: await loadComponent(layout),
      providers: (layout.providers ?? []).flat().filter((p) => p),
      label: `LayoutDefinition(${layout.path || index})`,
    })),
  );

  const page = await loadComponent(route);

  return Object.freeze([
    ...resolvedLayouts,
    {
      component: page,
      providers: (route.providers ?? []).flat().filter((p) => p),
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
          ? composeAngularLeafRouteView(appRef, documentRef, injector, tokens, views)
          : composeAngularRouteView(appRef, documentRef, injector, tokens, views),
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
        canActivate: primary.canActivate,
        canDeactivate: primary.canDeactivate,
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

export class FrameNavigator<TFrames extends NavigationTree = any> {
  private readonly appRef: ApplicationRef;
  private readonly injector: EnvironmentInjector;
  private readonly destroyRef: DestroyRef;
  private readonly document: Document;
  private readonly appBaseHref: string;
  private registry: ReturnType<typeof createRouteRegistry>;
  private activeSource: NavigationTree;
  private readonly deliveredBySlot = new Map<string, FrameContributionDefinition>();
  private readonly contributionIdentities = new Map<string, string>();
  private readonly pendingFrameResolutions = new Map<string, Promise<boolean>>();
  private readonly unresolvedFrameTargets = new Set<string>();
  private startupTask: Promise<void> | null = null;
  private engine: VanillaRouter | null = null;
  private currentState: RouterState = EMPTY_ROUTER_STATE;
  private readonly outlets = new Map<string, HTMLElement[]>();
  private tickQueued = false;

  public readonly navigateTo: TypedNavigate<TFrames>;
  public readonly hrefTo: TypedHref<TFrames>;

  constructor(private readonly configuration: FrameGraphConfiguration<TFrames>) {
    this.appRef = inject(ApplicationRef);
    this.injector = inject(EnvironmentInjector);
    this.destroyRef = inject(DestroyRef);
    this.document = inject(DOCUMENT);
    this.appBaseHref =
      inject(APP_BASE_HREF, {
        optional: true,
      }) ?? '/';

    for (const contribution of this.configuration.contributions ?? []) {
      this.deliveredBySlot.set(contribution.slotId, contribution);
    }
    this.activeSource = this.composeActiveSource();
    this.registry = createRouteRegistry(this.activeSource);
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
    const location = getRouterLocation(this.document);

    return `${location.pathname}${location.search}${location.hash}`;
  }

  connect(name: string, outlet: HTMLElement): void {
    const outletName = name.trim();

    const registered = this.outlets.get(outletName) ?? [];

    if (registered.includes(outlet)) {
      return;
    }

    registered.push(outlet);

    this.outlets.set(outletName, registered);

    if (this.engine || this.startupTask) {
      return;
    }

    this.startRouter();
  }

  private startRouter(): void {
    let task!: Promise<void>;

    task = Promise.resolve().then(async () => {
      const location = getRouterLocation(this.document);
      const url = new URL(location.href);
      await this.resolveServerFrames(url);

      if (this.startupTask !== task || this.engine || this.outlets.size === 0) {
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
      routes: adaptRoutes(this.registry.groups, this.appRef, this.document, this.injector),

      baseHref: this.baseHref,

      enableTracing: this.configuration.enableTracing,

      maxRedirects: this.configuration.maxRedirects,

      onSameUrlNavigation: this.configuration.onSameUrlNavigation,

      scrollRestoration: this.configuration.scrollRestoration,

      preloading: this.configuration.preloading,

      transitions: [
        ...adaptFrameGraphTransitions(this.registry),
        ...adaptFrameTransitions(this.registry.groups, this.injector),
      ],

      viewTransitions: this.configuration.viewTransitions,

      render: (targetName, node) => {
        const target = this.getOutlet(targetName);

        if (!target) {
          throw new Error(`Frame outlet "${targetName}" is not connected.`);
        }

        replaceChildNodes(target, node);
      },

      commit: (outlets) => {
        // First phase: validate all outlets exist before any DOM mutation.
        for (const outlet of outlets) {
          if (!this.outlets.has(outlet.name)) {
            throw new Error(`Frame outlet "${outlet.name}" is not connected.`);
          }
        }

        // Second phase: perform synchronous DOM mutations.
        for (const outlet of outlets) {
          const target = this.getOutlet(outlet.name);

          if (!target) {
            throw new Error(`Frame outlet "${outlet.name}" is not connected.`);
          }

          replaceChildNodes(target, outlet.node);
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
    const outletName = name.trim();

    const registered = this.outlets.get(outletName);

    if (!registered) {
      return;
    }

    const index = registered.lastIndexOf(outlet);

    if (index < 0) {
      return;
    }

    registered.splice(index, 1);

    if (registered.length === 0) {
      this.outlets.delete(outletName);
    }

    if (this.outlets.size === 0) {
      this.dispose();
    }
  }

  async navigate(target: NavigationTarget, options?: NavigationOptions): Promise<boolean> {
    let instruction = this.resolveNavigationInstruction(target);

    if (this.configuration.resolveFrames) {
      const candidateUrl = this.navigationTargetUrl(target, instruction);
      if (candidateUrl) {
        const changed = await this.resolveServerFrames(candidateUrl);
        if (changed) instruction = this.resolveNavigationInstruction(target);
      }
    }

    if (!instruction) {
      return false;
    }

    const navigationOptions =
      typeof target === 'object' &&
      target !== null &&
      'frame' in target &&
      options?.state === undefined
        ? {
            ...options,
            state: target.payload,
          }
        : { ...options };

    return await (await this.requireStartedEngine()).navigate(instruction.matchTarget, navigationOptions);
  }

  href(target: NavigationTarget | null | undefined): string | null {
    if (target === null || target === undefined) {
      return null;
    }

    if (typeof target === 'string' || target instanceof URL) {
      return this.resolveHref(target);
    }

    if ('path' in target) {
      return this.resolveHref(target.path);
    }

    if ('frame' in target) {
      return this.resolveNavigationInstruction(target)?.href ?? null;
    }

    if ('name' in target) {
      return this.resolveNavigationInstruction(target)?.href ?? null;
    }

    return null;
  }

  async revalidate(): Promise<boolean> {
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
    this.engine = null;
    this.outlets.clear();

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
    return routerHref(
      resolveRouterUrl(target, this.baseHref, getRouterLocation(this.document), 'href'),
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
    this.registry = createRouteRegistry(this.activeSource);

    if (!this.engine) return;
    this.engine.replaceConfiguration({
      routes: adaptRoutes(
        this.registry.groups,
        this.appRef,
        this.document,
        this.injector,
      ),
      transitions: [
        ...adaptFrameGraphTransitions(this.registry),
        ...adaptFrameTransitions(this.registry.groups, this.injector),
      ],
    });
  }

  private async resolveServerFrames(url: URL): Promise<boolean> {
    const resolver = this.configuration.resolveFrames;
    if (!resolver) return false;

    const key = `${url.pathname}${url.search}${url.hash}`;
    if (this.registryMatchesPath(url.pathname) || this.unresolvedFrameTargets.has(key)) {
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

  private registryMatchesPath(pathname: string): boolean {
    return this.registry.groups.some(group =>
      matchRoutePath(compileRoutePath(group.primary.path), pathname) !== null,
    );
  }

  private navigationTargetUrl(
    target: NavigationTarget,
    instruction: ResolvedNavigationInstruction | null,
  ): URL | null {
    if (instruction) {
      return new URL(instruction.matchTarget, getRouterLocation(this.document).origin);
    }
    if (typeof target === 'string' || target instanceof URL) {
      return resolveRouterUrl(
        target,
        this.baseHref,
        getRouterLocation(this.document),
        'href',
      );
    }
    if ('path' in target) {
      return resolveRouterUrl(
        target.path,
        this.baseHref,
        getRouterLocation(this.document),
        'href',
      );
    }
    return null;
  }

  private resolveNavigationInstruction(
    target: NavigationTarget,
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

    const path = 'name' in target
      ? buildNamedNavigationPath(this.registry, target)
      : buildNamedNavigationPath(this.registry, {
        name: target.frame,
        params: target.params,
        query: target.query,
      });

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
            ) as NamedNavigationTarget,
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
            ) as NamedNavigationTarget,
          );
      },
    }) as TypedHref<TFrames>;
  }

  private getOutlet(name: string): HTMLElement | null {
    const registered = this.outlets.get(name.trim());

    return registered?.[registered.length - 1] ?? null;
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
    {
      provide: FrameNavigator,
      useFactory: (configuration: FrameGraphConfiguration<TFrames>) =>
        new FrameNavigator<TFrames>(configuration),
      deps: [FRAME_GRAPH_CONFIGURATION],
    },
  ];
}

export const provideServerFrameGraph = provideFrameGraph;
