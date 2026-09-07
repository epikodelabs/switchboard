import { route } from './route-builders';
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
  RouteDefinition,
} from './navigation-definitions';

function validateCompiledRouteParams(
  route: RouteDefinition,
  path: string,
): void {
  if (route.kind === 'redirect') {
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

export interface CompiledRoute {
  readonly route: RouteDefinition;
  readonly path: string;
  readonly redirectTo?: string;
  readonly layouts:
    readonly LayoutDefinition[];
}

export interface CompiledRouteGroup {
  readonly primary: CompiledRoute;
  readonly outlets: readonly CompiledRoute[];
}

export function compileRedirect(
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
      entry.entries,
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

  if (entry.kind === 'redirect') {
    const path =
      joinRoutePath(
        parentPath,
        entry.path,
      );

    output.push({
      route: entry,
      path,
      redirectTo: compileRedirect(parentPath, entry.redirectTo),
      layouts,
    });

    return;
  }

  const path =
    joinRoutePath(
      parentPath,
      entry.path,
    );

  const frame = entry.frame;
  const routeRecord: RouteDefinition =
    frame?.id !== undefined && entry.name === undefined
      ? Object.freeze({ ...entry, name: frame.id })
      : entry;

  output.push({
    route: routeRecord,
    path,
    layouts,
  });

  for (const outlet of frame?.outlets ?? []) {
    output.push({
      route: route(
        entry.path,
        outlet.view,
        { outlet: outlet.outlet },
      ),
      path,
      layouts,
    });
  }
}

export function compileRoutes(
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

export function groupRoutes(
  compiled: readonly CompiledRoute[],
): readonly CompiledRouteGroup[] {
  const groups = new Map<string, CompiledRouteGroup>();

  for (const route of compiled) {
    const key = `${route.path}#${route.layouts.map(l => l.path).join('/')}`;
    let group = groups.get(key);

    if (!group) {
      if (route.route.kind === 'route' && route.route.outlet) {
        throw new Error(
          `Named outlet route "${route.route.name ?? route.path}" with path "${route.path}" has no corresponding primary outlet route with the same path.`,
        );
      }

      group = {
        primary: route,
        outlets: [],
      };

      groups.set(key, group);
    } else if (route.route.kind === 'redirect' || !route.route.outlet) {
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
      if (outlet.route.kind === 'redirect') {
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

export interface RouteRegistryRecord {
  readonly route: RouteDefinition;
  readonly fullPath: string;
}

export interface FrameRouteRegistryRecord {
  readonly frameId: string;
  readonly matchPath: string;
  readonly route: RouteDefinition;
  readonly frame: FrameView | null;
  readonly transitions: readonly string[];
  readonly directEntry: boolean;
  readonly directEntryRedirectTo?: string;
  readonly enforceGraph: boolean;
}

export interface FrameRouteRegistry {
  readonly byId:
    ReadonlyMap<string, FrameRouteRegistryRecord>;
  readonly defaultEntryPath: string | null;
}

export interface RouteRegistry {
  readonly namedRoutes:
    ReadonlyMap<
      string,
      RouteRegistryRecord
    >;
  readonly groups:
    readonly CompiledRouteGroup[];
  readonly frames:
    FrameRouteRegistry;
}

export function createRouteRegistry(
  source: NavigationTree,
): RouteRegistry {
  const namedRoutes =
    new Map<
      string,
      RouteRegistryRecord
    >();

  const groups = groupRoutes(
    compileRoutes(source),
  );
  validateRouteGroups(groups);

  const literalPaths =
    new Map<string, RouteDefinition>();
  const framesById =
    new Map<
      string,
      FrameRouteRegistryRecord
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
      && (previous.kind === 'redirect' || !previous.outlet)
      && (route.kind === 'redirect' || !route.outlet)
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
      namedRoutes.has(route.name)
    ) {
      throw new Error(
        `Duplicate route name ` +
        `"${route.name}". ` +
        'Route names must be globally unique.',
      );
    }

    namedRoutes.set(
      route.name,
      {
        route,
        fullPath: path,
      },
    );
  }

  let defaultEntryPath:
    string | null = null;

  for (const group of groups) {
    const route = group.primary.route;
    const frame = route.kind === 'route' ? route.frame : undefined;

    if (!frame?.id) {
      continue;
    }

    const enforceGraph =
      frame.transitions !== undefined
      || frame.directEntry !== undefined
      || frame.directEntryRedirectTo !== undefined;

    const record:
      FrameRouteRegistryRecord = {
        frameId: frame.id,
        matchPath: group.primary.path,
        route,
        frame,
        transitions:
          Object.freeze([
            ...(frame.transitions ?? []),
          ]),
        directEntry:
          frame.directEntry === true,
        directEntryRedirectTo:
          frame.directEntryRedirectTo,
        enforceGraph,
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

    if (
      defaultEntryPath === null
      && record.directEntry
    ) {
      defaultEntryPath =
        record.matchPath;
    }
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
    namedRoutes,
    groups,
    frames: {
      byId: framesById,
      defaultEntryPath,
    },
  };
}
