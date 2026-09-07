import type { Type } from '@angular/core';

import type { ParamSchemaRecord, QuerySchemaRecord } from './query-schema';
import type {
  FrameOptions,
  FrameOutlet,
  FrameOutletView,
  FramePrepareFn,
  FrameView,
  HookList,
  InferPreparedData,
  LayoutDefinition,
  Lazy,
  LayoutOptions,
  NavigationTree,
  RedirectRouteDefinition,
  RenderableRoute,
  RouteOptions,
  View,
  ViewDefinition,
} from './navigation-definitions';

function isFrame(
  value: unknown,
): value is FrameView {
  return typeof value === 'object'
    && value !== null
    && 'kind' in value
    && value.kind === 'frame';
}

function isAngularType(value: unknown): value is Type<unknown> {
  return typeof value === 'function'
    && ('ɵcmp' in value
      || 'ɵdir' in value
      || /^class\s/.test(Function.prototype.toString.call(value)));
}

function asArray<T>(value: import('./navigation-definitions').HookInput<T> | HookList<T> | undefined): readonly T[] | undefined {
  if (value === undefined) return undefined;
  return Object.freeze(Array.isArray(value) ? [...value] : [value as T]);
}

function normalizeFrameOutlets(
  outlets: FrameOptions<any>['outlets'],
): readonly FrameOutlet[] | undefined {
  if (!outlets) return undefined;
  if (Array.isArray(outlets)) return Object.freeze([...outlets]);
  return Object.freeze(
    Object.entries(outlets).map(([outlet, value]) => ({
      outlet,
      view: createFrameDefinitionView(value),
    })),
  );
}

function createFrameDefinitionView(
  view: FrameOutletView,
): FrameOutlet['view'] {
  return isFrame(view) ? view : { kind: 'frame', component: view };
}

type ViewRecord<
  TFrame extends FrameView<any> | undefined = FrameView<any> | undefined,
> = ViewDefinition & { readonly frame?: TFrame };

function createViewRecord(view: View | FrameView<any>): ViewRecord {
  if (isFrame(view)) {
    return 'component' in view && view.component !== undefined
      ? { component: view.component, frame: view }
      : { loadComponent: view.loadComponent, frame: view };
  }

  return isAngularType(view)
    ? { component: view, frame: undefined }
    : { loadComponent: view as Lazy<Type<unknown>>, frame: undefined };
}

function normalizeInlineHooks(
  view: View | FrameView<any>,
  hooks: Pick<
    RouteOptions<any, any, any, any>,
    'beforeEnter' | 'beforeLeave' | 'prepare' | 'afterEnter'
  >,
): ViewRecord {
  const existing = createViewRecord(view);
  const beforeEnter = asArray(hooks.beforeEnter);
  const beforeLeave = asArray(hooks.beforeLeave);
  const prepare = asArray(hooks.prepare);
  const afterEnter = asArray(hooks.afterEnter);
  const hasHooks = !!(
    beforeEnter?.length
    || beforeLeave?.length
    || prepare?.length
    || afterEnter?.length
  );

  if (!hasHooks) return existing as ViewRecord<undefined>;

  if (existing.frame) {
    return {
      ...existing,
      frame: {
        ...existing.frame,
        ...(beforeEnter?.length ? { beforeEnter: [...(existing.frame.beforeEnter ?? []), ...beforeEnter] } : {}),
        ...(beforeLeave?.length ? { beforeLeave: [...(existing.frame.beforeLeave ?? []), ...beforeLeave] } : {}),
        ...(prepare?.length ? { prepare: [...(existing.frame.prepare ?? []), ...prepare] } : {}),
        ...(afterEnter?.length ? { afterEnter: [...(existing.frame.afterEnter ?? []), ...afterEnter] } : {}),
      },
    };
  }

  const frameView: FrameView<any> = existing.component !== undefined
    ? { kind: 'frame', component: existing.component, beforeEnter, beforeLeave, prepare, afterEnter }
    : {
      kind: 'frame',
      loadComponent: existing.loadComponent!,
      beforeEnter,
      beforeLeave,
      prepare,
      afterEnter,
    };

  return {
    ...existing,
    frame: frameView,
  };
}

type NormalizePrepareInput<TPrepare> =
  TPrepare extends readonly FramePrepareFn[]
    ? TPrepare
    : TPrepare extends FramePrepareFn
      ? readonly [TPrepare]
      : undefined;

/**
 * Declares a frame: a view with a stable identity, optional transition-graph
 * edges, ownership of companion outlets, and lifecycle behavior. Place frames
 * with `route()`; the frame id becomes the placed route's name.
 */
export function frame<
  const TId extends string,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  id: TId,
  view: View | FrameView<any>,
  options: FrameOptions<TPrepare> = {},
): FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>> & { readonly id: TId } {
  const existing = createViewRecord(view);
  const base = existing.frame ?? ({ kind: 'frame' } as FrameView<any>);
  const beforeEnter = asArray(options.beforeEnter) ?? base.beforeEnter;
  const beforeLeave = asArray(options.beforeLeave) ?? base.beforeLeave;
  const prepare = asArray(options.prepare) ?? base.prepare;
  const afterEnter = asArray(options.afterEnter) ?? base.afterEnter;

  return {
    kind: 'frame',
    id,
    ...(existing.component !== undefined ? { component: existing.component } : { loadComponent: existing.loadComponent }),
    ...(beforeEnter?.length ? { beforeEnter } : {}),
    ...(beforeLeave?.length ? { beforeLeave } : {}),
    ...(prepare?.length ? { prepare } : {}),
    ...(afterEnter?.length ? { afterEnter } : {}),
    ...(options.transitions !== undefined ? { transitions: Object.freeze([...options.transitions]) } : {}),
    ...(options.directEntry !== undefined ? { directEntry: options.directEntry } : {}),
    ...(options.directEntryRedirectTo !== undefined ? { directEntryRedirectTo: options.directEntryRedirectTo } : {}),
    outlets: normalizeFrameOutlets(options.outlets),
    ...(options.policy !== undefined ? { policy: options.policy } : {}),
  } as FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>> & { readonly id: TId };
}

type AuthoredFrame<
  TView,
  TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
> = TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn>
  ? FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>>
  : TView extends FrameView<any>
    ? TView
    : undefined;

export function route<
  const TPath extends string,
  const TFrame extends FrameView<any> & { readonly id: string },
  const TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends QuerySchemaRecord | undefined = undefined,
>(
  path: TPath,
  frame: TFrame,
  options?: Omit<RouteOptions<TFrame['id'], TParamsSchema, TQuerySchema>, 'name'>,
): RenderableRoute<
  TPath,
  TFrame['id'],
  TParamsSchema,
  TQuerySchema,
  AuthoredFrame<TFrame, undefined>
>;
export function route<
  const TPath extends string,
  const TView extends View | FrameView<any>,
  const TName extends string | undefined = undefined,
  const TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends QuerySchemaRecord | undefined = undefined,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  path: TPath,
  view: TView,
  options?: RouteOptions<
    TName,
    TParamsSchema,
    TQuerySchema,
    TPrepare
  >,
): RenderableRoute<
  TPath,
  TName,
  TParamsSchema,
  TQuerySchema,
  AuthoredFrame<TView, TPrepare>
>;
export function route(
  path: string,
  view: View | FrameView<any>,
  options: RouteOptions<any, any, any, any> = {},
): RenderableRoute<any, any, any, any, any> {
  const {
    beforeEnter,
    beforeLeave,
    prepare,
    afterEnter,
    ...routeOptions
  } = options;

  const record = normalizeInlineHooks(view, { beforeEnter, beforeLeave, prepare, afterEnter });
  const name = routeOptions.name ?? record.frame?.id;

  return {
    kind: 'route',
    path,
    ...record,
    ...routeOptions,
    ...(name !== undefined ? { name } : {}),
  } as RenderableRoute<any, any, any, any, any>;
}

export function redirect<
  const TPath extends string,
  const TRedirectTo extends string,
  const TName extends string | undefined = undefined,
>(
  path: TPath,
  redirectTo: TRedirectTo,
  options: Pick<
    RouteOptions<TName, undefined, undefined>,
    'name' | 'data' | 'providers' | 'policy'
  > = {},
): RedirectRouteDefinition<
  TPath,
  TName
> {
  return {
    kind: 'redirect',
    path,
    redirectTo,
    ...options,
  };
}

export function layout<
  const TPath extends string,
  const TView extends View | FrameView<any>,
  const TEntries extends NavigationTree,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  path: TPath,
  view: TView,
  entries: TEntries,
  options: LayoutOptions & Pick<
    RouteOptions<any, any, any, TPrepare>,
    'beforeEnter' | 'beforeLeave' | 'prepare' | 'afterEnter'
  > = {},
): LayoutDefinition<
  TPath,
  TEntries,
  AuthoredFrame<TView, TPrepare>
> {
  const {
    beforeEnter,
    beforeLeave,
    prepare,
    afterEnter,
    ...layoutOptions
  } = options;

  return {
    kind: 'layout',
    path,
    ...normalizeInlineHooks(view, { beforeEnter, beforeLeave, prepare, afterEnter }),
    entries,
    ...layoutOptions,
  } as LayoutDefinition<TPath, TEntries, AuthoredFrame<TView, TPrepare>>;
}
