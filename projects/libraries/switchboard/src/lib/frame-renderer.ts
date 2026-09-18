import {
  ApplicationRef,
  EnvironmentInjector,
  Injector,
  Type,
  createComponent,
  createEnvironmentInjector,
} from '@angular/core';

import { bindFrameInputs } from './frame-input-adapter';
import { FRAME_RELAY_RUNTIME, Relay } from './frame-relay';
import { FRAME_TREE, type FrameNode } from './frame-tree';
import { replaceChildNodes } from './adapter-utils';

import type { NavigationProviders } from './navigation-definitions';

import {
  OUTLET_ACTIVATE_EVENT,
  OUTLET_DEACTIVATE_EVENT,
  dispatchOutletLifecycleEvent,
  findContainingOutlet,
  findOutlet,
} from './frame-events';

import type {
  ActivatedRoute,
  RenderedRouteNode,
  RouteComponent,
  RouteRenderContext,
} from './vanilla-router';

export interface FrameRenderTokens {
  readonly routeToken: unknown;
  readonly contextToken: unknown;
}

export interface ResolvedFrameView {
  readonly component: Type<unknown>;
  readonly providers?: NavigationProviders;
  readonly frameId?: string;
  readonly transitions?: readonly string[];
  readonly label: string;
}

interface RenderedLayer {
  readonly rendered: RenderedRouteNode;
  readonly injector?: EnvironmentInjector;
}

function createScopedInjector(
  providers: NavigationProviders | undefined,
  parent: EnvironmentInjector,
  label: string,
  frameId?: string,
  host?: HTMLElement,
  transitions?: readonly string[],
): EnvironmentInjector | undefined {
  if (!providers?.length && !frameId) {
    return undefined;
  }

  try {
    const scopedProviders = [...(providers ? Array.from(providers) : [])];
    if (frameId && host) {
      const tree = parent.get(FRAME_TREE);
      const runtime = parent.get(FRAME_RELAY_RUNTIME);
      const node = tree.create(frameId, host, transitions);
      scopedProviders.push({ provide: Relay, useValue: new Relay(node, runtime) });
      const scoped = createEnvironmentInjector(scopedProviders, parent, label);
      scoped.onDestroy(() => tree.remove(node));
      return scoped;
    }
    return createEnvironmentInjector(scopedProviders, parent, label);
  } catch (error) {
    throw new Error(
      `Failed to create frame injector for "${label}": ` +
        (error instanceof Error ? error.message : String(error)),
      { cause: error },
    );
  }
}

function createAngularComponent(
  appRef: ApplicationRef,
  documentRef: Document,
  tokens: FrameRenderTokens,
  component: Type<unknown>,
  environmentInjector: EnvironmentInjector,
  route: ActivatedRoute,
  context: RouteRenderContext,
  host: HTMLElement = documentRef.createElement('frame-host'),
): RenderedRouteNode {

  const elementInjector = Injector.create({
    parent: environmentInjector,
    providers: [
      {
        provide: tokens.routeToken,
        useValue: route,
      },
      {
        provide: tokens.contextToken,
        useValue: context,
      },
    ],
  });

  const ref = createComponent(component, {
    hostElement: host,
    elementInjector,
    environmentInjector,
  });

  let attached = false;
  let disposed = false;
  let containingOutlet: HTMLElement | null = null;

  try {
    try {
      bindFrameInputs(ref, component, route);
    } catch (error) {
      throw new Error(
        `Failed to bind frame inputs for "${component.name || 'anonymous component'}": ` +
          (error instanceof Error ? error.message : String(error)),
        { cause: error },
      );
    }

    appRef.attachView(ref.hostView);

    attached = true;

    ref.changeDetectorRef.detectChanges();
  } catch (error) {
    if (attached) {
      try {
        appRef.detachView(ref.hostView);
      } catch {}
    }

    ref.destroy();
    throw error;
  }

  return {
    node: host,
    component: ref.instance,

    dispose(): void {
      if (disposed) {
        return;
      }

      disposed = true;

      containingOutlet ??=
        (
          host as Node & {
            __frameOutlet?: HTMLElement;
          }
        ).__frameOutlet ?? null;

      const outlet = containingOutlet ?? findContainingOutlet(host);

      if (outlet) {
        dispatchOutletLifecycleEvent(outlet, OUTLET_DEACTIVATE_EVENT, ref.instance);
      }

      try {
        if (attached) {
          appRef.detachView(ref.hostView);

          attached = false;
        }
      } finally {
        ref.destroy();
        const tree = environmentInjector.get(FRAME_TREE, null);
        const frameNode = tree?.nodeForHost(host);
        if (frameNode) tree?.remove(frameNode);
        host.remove();
      }
    },
  };
}

function disposeLayers(layers: readonly RenderedLayer[]): void {
  const errors: unknown[] = [];

  for (let index = layers.length - 1; index >= 0; index--) {
    const layer = layers[index];

    try {
      layer.rendered.dispose?.();
    } catch (error) {
      errors.push(error);
    }

    try {
      layer.injector?.destroy();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, 'Multiple errors occurred while disposing a frame view.');
  }
}

export function composeAngularFrameView(
  appRef: ApplicationRef,
  documentRef: Document,
  rootInjector: EnvironmentInjector,
  tokens: FrameRenderTokens,
  views: readonly ResolvedFrameView[],
): RouteComponent {
  return async (route, context) => {
    const layers: RenderedLayer[] = [];

    let parentInjector = rootInjector;

    try {
      for (let index = 0; index < views.length; index++) {
        const view = views[index];
        const host = documentRef.createElement('frame-host');
        const scopedInjector = createScopedInjector(view.providers, parentInjector, view.label, view.frameId, host, view.transitions);

        const activeInjector = scopedInjector ?? parentInjector;

        const rendered = createAngularComponent(
          appRef, documentRef, tokens, view.component, activeInjector, route, context, host,
        );

        const parent = layers[layers.length - 1];

        if (parent) {
          // The frame outlet selects the application-level render target.
          // Layout layers always compose through their primary child outlet.
          const outletName = '';
          const outlet = findOutlet(parent.rendered.node, outletName);

          if (!outlet) {
            throw new Error(
              `Cannot render "${view.label}": ` +
                `the parent layout has no frame outlet` +
                (outletName ? ` named "${outletName}"` : ` (primary)`),
            );
          }

          replaceChildNodes(outlet, rendered.node);
          const tree = activeInjector.get(FRAME_TREE, null);
          const frameNode = tree?.nodeForHost(rendered.node as HTMLElement);
          if (tree && frameNode) tree.mount(frameNode, outlet);

          // Capture the outlet while the node is attached. Parent-layer
          // disposal may detach this host before its own dispose() runs.
          const renderedNode = rendered.node as Node & {
            __frameOutlet?: HTMLElement;
          };
          renderedNode.__frameOutlet = outlet;

          if (rendered.component !== undefined) {
            dispatchOutletLifecycleEvent(outlet, OUTLET_ACTIVATE_EVENT, rendered.component);
          }
        }

        layers.push({
          rendered,
          injector: scopedInjector,
        });

        parentInjector = activeInjector;
      }

      const first = layers[0];

      const last = layers[layers.length - 1];

      if (!first || !last) {
        throw new Error('A frame view requires at least one component.');
      }

      return {
        node: first.rendered.node,
        component: last.rendered.component,

        dispose(): void {
          disposeLayers(layers);
        },
      };
    } catch (error) {
      disposeLayers(layers);
      throw error;
    }
  };
}

export function composeAngularLeafFrameView(
  appRef: ApplicationRef,
  documentRef: Document,
  rootInjector: EnvironmentInjector,
  tokens: FrameRenderTokens,
  views: readonly ResolvedFrameView[],
): RouteComponent {
  return async (route, context) => {
    const scopedInjectors: EnvironmentInjector[] = [];

    let parentInjector = rootInjector;

    try {
      const leafHost = documentRef.createElement('frame-host');
      const leafView = views[views.length - 1];
      for (const view of views) {
        const scopedInjector = createScopedInjector(
          view.providers, parentInjector, view.label, view.frameId, view === leafView ? leafHost : undefined, view.transitions,
        );

        if (scopedInjector) {
          scopedInjectors.push(scopedInjector);
          parentInjector = scopedInjector;
        }
      }

      const leaf = views[views.length - 1];

      if (!leaf) {
        throw new Error('A frame view requires at least one component.');
      }

      const rendered = createAngularComponent(
        appRef,
        documentRef,
        tokens,
        leaf.component,
        parentInjector,
        route,
        context,
        leafHost,
      );

      return {
        node: rendered.node,
        component: rendered.component,

        dispose(): void {
          const errors: unknown[] = [];

          try {
            rendered.dispose?.();
          } catch (error) {
            errors.push(error);
          }

          for (let index = scopedInjectors.length - 1; index >= 0; index--) {
            try {
              scopedInjectors[index].destroy();
            } catch (error) {
              errors.push(error);
            }
          }

          if (errors.length === 1) {
            throw errors[0];
          }

          if (errors.length > 1) {
            throw new AggregateError(
              errors,
              'Multiple errors occurred while disposing a frame view.',
            );
          }
        },
      };
    } catch (error) {
      for (let index = scopedInjectors.length - 1; index >= 0; index--) {
        try {
          scopedInjectors[index].destroy();
        } catch {}
      }

      throw error;
    }
  };
}