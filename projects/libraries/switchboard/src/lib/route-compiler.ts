import {
  buildAddressRoutes,
  buildFrameRoutes,
} from './frame-routes';
import type {
  AddressDefinition,
  FrameNavigationOptions,
  FrameRouteDefinition,
  LayoutDefinition,
  RenderableRoute,
  RouteDefinition,
  NavigationTree,
} from './navigation-definitions';

export interface CompiledRoute {
  readonly route: RouteDefinition;
  readonly path: string;
  readonly redirectTo?: string;
  readonly layouts:
    readonly LayoutDefinition[];
}

export interface CompiledRouteGroup {
  readonly path: string;
  readonly layouts: readonly LayoutDefinition[];
  readonly primary: CompiledRoute;
  readonly outlets: readonly CompiledRoute[];
}

export function joinRoutePath(
  parent: string,
  child: string,
): string {
  const parentSegments =
    parent
      .split('/')
      .filter(Boolean);

  const childSegments =
    child
      .split('/')
      .filter(Boolean);

  const joined = [
    ...parentSegments,
    ...childSegments,
  ].join('/');

  return joined
    ? `/${joined}`
    : '/';
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

export function compileRoutes(
  entries: NavigationTree,
  parentPath = '/',
  layouts:
    readonly LayoutDefinition[] = [],
  output: CompiledRoute[] = []
): readonly CompiledRoute[] {
  for (const entry of entries) {
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

      continue;
    }

    if (entry.kind === 'address') {
      compileRoutes(
        buildAddressRoutes(
          entry as AddressDefinition,
        ),
        parentPath,
        layouts,
        output,
      );

      continue;
    }

    if (entry.kind === 'frame-route') {
      compileRoutes(
        buildFrameRoutes(entry as FrameRouteDefinition),
        parentPath,
        layouts,
        output,
      );

      continue;
    }

    output.push({
      route: entry,
      path: joinRoutePath(
        parentPath,
        entry.path,
      ),
      redirectTo: compileRedirect(
        parentPath,
        entry.redirectTo,
      ),
      layouts,
    });
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
      if (route.route.outlet) {
        throw new Error(
          `Named outlet route "${route.route.name ?? route.path}" with path "${route.path}" has no corresponding primary outlet route with the same path.`,
        );
      }

      group = {
        path: route.path,
        layouts: route.layouts,
        primary: route,
        outlets: [],
      };

      groups.set(key, group);
    } else if (!route.route.outlet) {
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
  const names = new Set<string>();

  for (const group of groups) {
    const primaryName = group.primary.route.name;
    if (primaryName) {
      if (names.has(primaryName)) {
        throw new Error(`Duplicate route name "${primaryName}". Route names must be globally unique.`);
      }
      names.add(primaryName);
    }

    if (group.primary.redirectTo && group.outlets.length > 0) {
      throw new Error(
        `A redirect route cannot have named outlets. Path: "${group.path}"`,
      );
    }

    const outletNames = new Set<string>();
    for (const outlet of group.outlets) {
      const outletName = outlet.route.outlet!;
      if (outletNames.has(outletName)) {
        throw new Error(
          `Duplicate outlet named "${outletName}" for route path "${group.path}".`,
        );
      }
      outletNames.add(outletName);

      if (outlet.route.name) {
        throw new Error(
          `Named outlet routes cannot have a "name" property. Route path: "${group.path}", outlet: "${outletName}"`,
        );
      }

      if (outlet.redirectTo) {
        throw new Error(
          `Named outlet routes cannot be redirects. Route path: "${group.path}", outlet: "${outletName}"`,
        );
      }

      if (outlet.route.paramsSchema || outlet.route.querySchema) {
        throw new Error('Named outlet routes cannot define paramsSchema or querySchema.');
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

function normalizePattern(
  path: string,
): string {
  return path.replace(
    /:([A-Za-z_][A-Za-z0-9_]*)/g,
    ':',
  );
}

export interface RouteRegistryRecord {
  readonly route: RouteDefinition;
  readonly fullPath: string;
}

export interface FrameRouteRegistryRecord {
  readonly frameId: string;
  readonly fullPath: string;
  readonly transitions: readonly string[];
  readonly directEntry: boolean;
  readonly directEntryRedirectTo?:
    FrameNavigationOptions['directEntryRedirectTo'];
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

function readFrameNavigation(
  route: RouteDefinition,
): {
  readonly frameId: string;
  readonly navigation:
    FrameNavigationOptions | undefined;
} | null {
  const renderableRoute =
    route as RenderableRoute;

  if (
    !route.name
    || !renderableRoute.frameNavigation
  ) {
    return null;
  }

  return {
    frameId: route.name,
    navigation:
      renderableRoute.frameNavigation,
  };
}

export function createRouteRegistry(
  entries: NavigationTree,
): RouteRegistry {
  const namedRoutes =
    new Map<
      string,
      RouteRegistryRecord
    >();
  
  const groups = groupRoutes(compileRoutes(entries));
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
    const {
      route,
      path,
    } of groups.flatMap(g => [g.primary, ...g.outlets])
  ) {
    const previous =
      literalPaths.get(path);

    if (previous && !previous.outlet && !route.outlet) {
      throw new Error(
        `Duplicate compiled route path "${path}".`,
      );
    }

    literalPaths.set(path, route);

    const pattern =
      normalizePattern(path);

    const previousPattern =
      patterns.get(pattern);

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
    const frameRoute =
      readFrameNavigation(
        group.primary.route,
      );

    if (!frameRoute) {
      continue;
    }

    const record:
      FrameRouteRegistryRecord = {
        frameId:
          frameRoute.frameId,
        fullPath:
          group.path,
        transitions:
          Object.freeze([
            ...(frameRoute.navigation?.transitions ?? []),
          ]),
        directEntry:
          frameRoute.navigation?.directEntry === true,
        directEntryRedirectTo:
          frameRoute.navigation?.directEntryRedirectTo,
        enforceGraph:
          frameRoute.navigation !== undefined,
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
        record.fullPath;
    }
  }

  for (const frame of framesById.values()) {
    for (const targetId of frame.transitions) {
      if (
        targetId === frame.frameId
      ) {
        continue;
      }

      if (
        !framesById.has(
          targetId,
        )
      ) {
        throw new Error(
          `Frame "${frame.frameId}" references unknown transition target "${targetId}".`,
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

