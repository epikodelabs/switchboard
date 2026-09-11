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
  RedirectFrameDefinition,
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
 * Declares a frame: a self-contained view with address, stable identity,
 * transition-graph edges, companion outlets, and lifecycle behavior.
 */
export function frame<
  const TId extends string,
  const TPath extends string,
  const TChildren extends NavigationTree | undefined = undefined,
  const TParamsSchema extends ParamSchemaRecord | undefined = undefined,
  const TQuerySchema extends QuerySchemaRecord | undefined = undefined,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  id: TId,
  path: TPath,
  view: View | FrameView<any>,
  options?: FrameOptions<TPrepare, TParamsSchema, TQuerySchema> & { readonly children?: TChildren },
): FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>> & {
  readonly id: TId;
  readonly path: TPath;
  readonly children?: TChildren;
  readonly params?: TParamsSchema;
  readonly query?: TQuerySchema;
};
export function frame<
  const TId extends string,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  id: TId,
  view: View | FrameView<any>,
  options?: FrameOptions<TPrepare>,
): FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>> & { readonly id: TId };
export function frame<
  const TId extends string,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  id: TId,
  pathOrView: string | View | FrameView<any>,
  viewOrOptions?: View | FrameView<any> | FrameOptions<TPrepare>,
  maybeOptions: FrameOptions<TPrepare> = {},
): FrameView<InferPreparedData<NormalizePrepareInput<TPrepare>>> & { readonly id: TId; readonly path?: string } {
  const hasPath = typeof pathOrView === 'string';
  const path = hasPath ? pathOrView : undefined;
  const view = hasPath ? viewOrOptions as View | FrameView<any> : pathOrView;
  const options = (hasPath ? maybeOptions : viewOrOptions as FrameOptions<TPrepare> | undefined) ?? {};
  const existing = createViewRecord(view);
  const base = existing.frame ?? ({ kind: 'frame' } as FrameView<any>);
  const beforeEnter = asArray(options.beforeEnter) ?? base.beforeEnter;
  const beforeLeave = asArray(options.beforeLeave) ?? base.beforeLeave;
  const prepare = asArray(options.prepare) ?? base.prepare;
  const afterEnter = asArray(options.afterEnter) ?? base.afterEnter;

  return {
    kind: 'frame',
    id,
    ...(path !== undefined ? { path } : {}),
    ...(existing.component !== undefined ? { component: existing.component } : { loadComponent: existing.loadComponent }),
    ...(options.preload !== undefined ? { preload: options.preload } : {}),
    ...(options.viewTransition !== undefined ? { viewTransition: options.viewTransition } : {}),
    ...(options.params !== undefined ? { params: options.params } : {}),
    ...(options.query !== undefined ? { query: options.query } : {}),
    ...(options.data !== undefined ? { data: options.data } : {}),
    ...(options.providers !== undefined ? { providers: options.providers } : {}),
    ...(beforeEnter?.length ? { beforeEnter } : {}),
    ...(beforeLeave?.length ? { beforeLeave } : {}),
    ...(prepare?.length ? { prepare } : {}),
    ...(afterEnter?.length ? { afterEnter } : {}),
    ...(options.transitions !== undefined ? { transitions: Object.freeze([...options.transitions]) } : {}),
    ...(options.directEntry !== undefined ? { directEntry: options.directEntry } : {}),
    ...(options.directEntryRedirectTo !== undefined ? { directEntryRedirectTo: options.directEntryRedirectTo } : {}),
    outlets: normalizeFrameOutlets(options.outlets),
    ...(options.children !== undefined ? { children: options.children } : {}),
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

export function redirect<
  const TPath extends string,
  const TName extends string | undefined = undefined,
>(
  path: TPath,
  target: FrameView<any> & { readonly id: string; readonly path?: string },
  options: Pick<
    RouteOptions<TName, undefined, undefined>,
    'name' | 'data' | 'providers' | 'policy'
  > = {},
): RedirectFrameDefinition<TPath, TName> {
  return {
    kind: 'redirect-frame',
    path,
    targetFrameId: target.id,
    ...options,
  };
}

export function layout<
  const TPath extends string,
  const TView extends View | FrameView<any>,
  const TChildren extends NavigationTree,
  const TPrepare extends import('./navigation-definitions').HookInput<FramePrepareFn> | undefined =
    import('./navigation-definitions').HookInput<FramePrepareFn> | undefined,
>(
  path: TPath,
  view: TView,
  children: TChildren,
  options: LayoutOptions & Pick<
    RouteOptions<any, any, any, TPrepare>,
    'beforeEnter' | 'beforeLeave' | 'prepare' | 'afterEnter'
  > = {},
): LayoutDefinition<
  TPath,
  TChildren,
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
    children,
    ...layoutOptions,
  } as LayoutDefinition<TPath, TChildren, AuthoredFrame<TView, TPrepare>>;
}
