import {
  compileRoutePath,
  extractRouteParamNames,
  joinRoutePath,
} from './route-path';

export { joinRoutePath } from './route-path';
import type {
  FrameView,
  LayoutDefinition,
  NavigationTree,
  RedirectFrameDefinition,
  RedirectRouteDefinition,
  RenderableRoute,
  RouteDefinition,
} from './navigation-definitions';

function isRedirectRouteDefinition(
  route: unknown,
): route is RedirectRouteDefinition {
  return typeof route === 'object'
    && route !== null
    && 'redirectTo' in route;
}

function isRedirectFrameDefinition(
  entry: NavigationTree[number],
): entry is RedirectFrameDefinition {
  return entry.kind === 'redirect-frame';
}

function isFrameDefinition(
  entry: NavigationTree[number],
): entry is FrameView {
  return entry.kind === 'frame';
}

function createOutletRoute(
  path: string,
  outlet: string,
  view: FrameView,
): RenderableRoute {
  return {
    kind: 'route',
    path,
    outlet,
    ...(view.component !== undefined ? { component: view.component } : { loadComponent: view.loadComponent }),
    frame: view,
  };
}

function validateCompiledRouteParams(
  route: RouteDefinition,
  path: string,
): void {
  if (isRedirectRouteDefinition(route)) {
    return;
  }

  const paramNames = extractRouteParamNames(path);
  const seen = new Set<string>();

  for (const name of paramNames) {
    if (seen.has(name)) {
      throw new Error(
        `Duplicate path parameter ":${name}" in compiled route "${path}". ` +
        'Path parameter names must be unique across the complete layout and route path.',
      );
    }
    seen.add(name);
  }

  const schema = route.params;
  if (!schema) return;

  const schemaNames = Object.keys(schema);
  for (const name of schemaNames) {
    if (!seen.has(name)) {
      throw new Error(
        `params declares "${name}", but compiled route "${path}" ` +
        `does not contain ":${name}".`,
      );
    }
  }

  const declared = new Set(schemaNames);
  for (const name of paramNames) {
    if (!declared.has(name)) {
      throw new Error(
        `Compiled route "${path}" contains ":${name}", but params ` +
        `does not declare it. Declare every path parameter when params is present.`,
      );
    }
  }
}

interface CompiledRoute {
  readonly route: RouteDefinition;
  readonly path: string;
  readonly redirectTo?: string;
  readonly redirectFrameTargetId?: string;
  readonly layouts:
    readonly LayoutDefinition[];
}

export interface CompiledRouteGroup {
  readonly primary: CompiledRoute;
  readonly outlets: readonly CompiledRoute[];
}

function compileRedirect(
  parentPath: string,
  redirectTo:
    string | undefined,
): string | undefined {
  if (!redirectTo) {
    return undefined;
  }

  if (
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(redirectTo) ||
    redirectTo.startsWith('//')
  ) {
    return redirectTo;
  }

  return redirectTo.startsWith('/')
    ? joinRoutePath('/', redirectTo)
    : joinRoutePath(
        parentPath,
        redirectTo,
      );
}

function compileEntry(
  entry: NavigationTree[number],
  parentPath: string,
  layouts: readonly LayoutDefinition[],
  output: CompiledRoute[],
): void {
  if (entry.kind === 'layout') {
    compileRoutes(
      entry.layout,
      joinRoutePath(
        parentPath,
        entry.path,
      ),
      Object.freeze([
        ...layouts,
        entry,
      ]),
      output,
    );

    return;
  }

  if (entry.kind === 'frame-slot') {
    // An unresolved slot is an empty ownership boundary. Server/client delivery
    // resolves authorized contributions before compiling the active graph.
    return;
  }

  if (isRedirectFrameDefinition(entry)) {
    const path =
      joinRoutePath(
        parentPath,
        entry.path,
      );

    const routeRecord: RedirectRouteDefinition = {
      kind: 'route',
      path: entry.path,
      ...(entry.name !== undefined ? { name: entry.name } : {}),
      redirectTo: entry.targetFrameId,
      ...(entry.data !== undefined ? { data: entry.data } : {}),
      ...(entry.providers !== undefined ? { providers: entry.providers } : {}),
      ...(entry.policy !== undefined ? { policy: entry.policy } : {}),
    };

    output.push({
      route: routeRecord,
      path,
      redirectFrameTargetId: entry.targetFrameId,
      layouts,
    });

    return;
  }

  if (isFrameDefinition(entry)) {
    if (entry.path === undefined) {
      throw new Error(`Frame "${entry.id ?? '(anonymous)'}" cannot be used as a navigation entry without a path.`);
    }

    const path =
      joinRoutePath(
        parentPath,
        entry.path,
      );

    if (entry.layout) {
      const frameLayout: LayoutDefinition = {
        kind: 'layout',
        path: entry.path,
        layout: entry.layout,
        ...(entry.providers !== undefined ? { providers: entry.providers } : {}),
        ...(entry.component !== undefined ? { component: entry.component } : { loadComponent: entry.loadComponent }),
        frame: entry,
      };

      compileRoutes(
        entry.layout,
        path,
        Object.freeze([
          ...layouts,
          frameLayout,
        ]),
        output,
      );

      return;
    }

    const routeRecord: RenderableRoute = {
      kind: 'route',
      path: entry.path,
      ...(entry.name !== undefined ? { name: entry.name } : entry.id !== undefined ? { name: entry.id } : {}),
      ...(entry.preload !== undefined ? { preload: entry.preload } : {}),
      ...(entry.viewTransition !== undefined ? { viewTransition: entry.viewTransition } : {}),
      ...(entry.params !== undefined ? { params: entry.params } : {}),
      ...(entry.query !== undefined ? { query: entry.query } : {}),
      ...(entry.data !== undefined ? { data: entry.data } : {}),
      ...(entry.providers !== undefined ? { providers: entry.providers } : {}),
      ...(entry.policy !== undefined ? { policy: entry.policy } : {}),
      ...(entry.component !== undefined ? { component: entry.component } : { loadComponent: entry.loadComponent }),
      frame: entry,
    };

    output.push({
      route: routeRecord,
      path,
      layouts,
    });

    for (const outlet of entry.outlets ?? []) {
      output.push({
        route: createOutletRoute(entry.path, outlet.outlet, outlet.view),
        path,
        layouts,
      });
    }

    return;
  }

  throw new Error(`Unsupported navigation entry kind "${String(entry.kind)}".`);
}

function compileRoutes(
  source: NavigationTree,
  parentPath = '/',
  layouts:
    readonly LayoutDefinition[] = [],
  output: CompiledRoute[] = [],
): readonly CompiledRoute[] {
  for (const entry of source) {
    compileEntry(entry, parentPath, layouts, output);
  }

  return output;
}

function resolveRedirectFrameTargets(
  compiled: readonly CompiledRoute[],
): readonly CompiledRoute[] {
  const framePaths = new Map<string, string>();

  for (const item of compiled) {
    if (isRedirectRouteDefinition(item.route)) {
      continue;
    }

    const frameId = item.route.frame?.id;
    if (frameId) {
      framePaths.set(frameId, item.path);
    }
  }

  return compiled.map((item) => {
    if (!item.redirectFrameTargetId) {
      return item;
    }

    const redirectTo = framePaths.get(item.redirectFrameTargetId);
    if (!redirectTo) {
      throw new Error(
        `Redirect frame "${item.path}" targets unknown frame "${item.redirectFrameTargetId}".`,
      );
    }

    return {
      ...item,
      redirectTo,
    };
  });
}

function groupRoutes(
  compiled: readonly CompiledRoute[],
): readonly CompiledRouteGroup[] {
  const groups = new Map<string, CompiledRouteGroup>();

  for (const route of compiled) {
    const key = `${route.path}#${route.layouts.map(l => l.path).join('/')}`;
    let group = groups.get(key);

    if (!group) {
      if (!isRedirectRouteDefinition(route.route) && route.route.outlet) {
        throw new Error(
          `Named outlet route "${route.route.name ?? route.path}" with path "${route.path}" has no corresponding primary outlet route with the same path.`,
        );
      }

      group = {
        primary: route,
        outlets: [],
      };

      groups.set(key, group);
    } else if (isRedirectRouteDefinition(route.route) || !route.route.outlet) {
      throw new Error(
        `Duplicate primary route for path "${route.path}" under the same layout chain.`,
      );
    } else {
      group = {
        ...group,
        outlets: [...group.outlets, route],
      };

      groups.set(key, group);
    }
  }

  return Array.from(groups.values());
}

function validateRouteGroups(
  groups: readonly CompiledRouteGroup[],
): void {
  for (const group of groups) {
    if (group.primary.redirectTo && group.outlets.length > 0) {
      throw new Error(
        `A redirect route cannot have named outlets. Path: "${group.primary.path}"`,
      );
    }

    const outletNames = new Set<string>();
    for (const outlet of group.outlets) {
      if (isRedirectRouteDefinition(outlet.route)) {
        throw new Error(
          `Named outlet routes cannot be redirects. Route path: "${group.primary.path}"`,
        );
      }

      const outletName = outlet.route.outlet!;

      if (outletNames.has(outletName)) {
        throw new Error(
          `Duplicate outlet named "${outletName}" for route path "${group.primary.path}".`,
        );
      }
      outletNames.add(outletName);

      if (outlet.route.name) {
        throw new Error(
          `Named outlet routes cannot have a "name" property. Route path: "${group.primary.path}", outlet: "${outletName}"`,
        );
      }

      if (outlet.route.params || outlet.route.query) {
        throw new Error('Named outlet routes cannot define params or query.');
      }

      if (outlet.route.viewTransition !== undefined) {
        throw new Error('Named outlet routes cannot define viewTransition.');
      }

      if (outlet.route.preload !== undefined) {
        throw new Error('Named outlet routes cannot define preload.');
      }
    }
  }
}

export interface FrameAddressRecord {
  readonly route: RouteDefinition;
  readonly fullPath: string;
}

export interface CompiledFrameRoutes {
  /** Address lookup only. This is not a frame graph. */
  readonly addresses: ReadonlyMap<string, FrameAddressRecord>;
  readonly groups: readonly CompiledRouteGroup[];
}

export function compileFrameRoutes(
  source: NavigationTree,
): CompiledFrameRoutes {
  const addresses =
    new Map<
      string,
      FrameAddressRecord
    >();

  const groups = groupRoutes(
    resolveRedirectFrameTargets(compileRoutes(source)),
  );
  validateRouteGroups(groups);

  const literalPaths =
    new Map<string, RouteDefinition>();
  const framesById =
    new Map<
      string,
      { readonly frameId: string; readonly transitions: readonly string[] }
    >();
  const patterns =
    new Map<string, string>();

  for (
    const { route, path } of groups.flatMap(g => [g.primary, ...g.outlets])
  ) {
    const previous =
      literalPaths.get(path);

    if (
      previous
      && (isRedirectRouteDefinition(previous) || !previous.outlet)
      && (isRedirectRouteDefinition(route) || !route.outlet)
    ) {
      throw new Error(
        `Duplicate compiled route path "${path}".`,
      );
    }

    literalPaths.set(path, route);

    validateCompiledRouteParams(route, path);

    const pattern = compileRoutePath(path).patternKey;
    const previousPattern = patterns.get(pattern);

    if (
      previousPattern &&
      previousPattern !== path
    ) {
      throw new Error(
        `Conflicting route patterns ` +
        `"${previousPattern}" and "${path}".`,
      );
    }

    patterns.set(pattern, path);

    if (!route.name) {
      continue;
    }

    if (
      addresses.has(route.name)
    ) {
      throw new Error(
        `Duplicate route name ` +
        `"${route.name}". ` +
        'Route names must be globally unique.',
      );
    }

    addresses.set(
      route.name,
      {
        route,
        fullPath: path,
      },
    );
  }

  for (const group of groups) {
    const route = group.primary.route;
    const frame = !isRedirectRouteDefinition(route) ? route.frame : undefined;

    if (!frame?.id) {
      continue;
    }

    const record = {
      frameId: frame.id,
      transitions: Object.freeze([...(frame.transitions ?? [])]),
    };

    if (
      framesById.has(
        record.frameId,
      )
    ) {
      throw new Error(
        `Duplicate frame id "${record.frameId}".`,
      );
    }

    framesById.set(
      record.frameId,
      record,
    );
  }

  for (const placedFrame of framesById.values()) {
    for (const targetId of placedFrame.transitions) {
      if (
        targetId === placedFrame.frameId
      ) {
        continue;
      }

      if (
        !framesById.has(
          targetId,
        )
      ) {
        throw new Error(
          `Frame "${placedFrame.frameId}" references unknown transition target "${targetId}".`,
        );
      }
    }
  }

  return {
    addresses,
    groups,
  };
}
