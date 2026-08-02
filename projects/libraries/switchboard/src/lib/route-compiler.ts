import {
  buildAddressRoutes,
  buildFrameRoutes,
  buildInternalFrameRoutes,
} from './frame-routes';
import type {
  AddressDefinition,
  AnyFrameDefinition,
  AnyNavigationDefinition,
  FrameNavigationOptions,
  FrameRouteDefinition,
  LayoutDefinition,
  NavigationSource,
  NavigationTree,
  RenderableRoute,
  RouteDefinition,
} from './navigation-definitions';

export interface CompiledRoute {
  readonly route: RouteDefinition;
  readonly path: string;
  readonly addressPath: string | null;
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

function isNavigationDefinition(
  source: NavigationSource,
): source is AnyNavigationDefinition {
  return !Array.isArray(source)
    && typeof source === 'object'
    && source !== null
    && 'kind' in source
    && source.kind === 'navigation';
}

export function resolveNavigationEntries(
  source: NavigationSource,
): NavigationTree {
  return isNavigationDefinition(source)
    ? source.entries
    : source;
}

function resolveDeclaredFrames(
  source: NavigationSource,
): readonly AnyFrameDefinition[] {
  return isNavigationDefinition(source)
    ? source.frames
    : [];
}

export function createInternalFramePath(
  frameId: string,
): string {
  return `/.switchboard/frames/${encodeURIComponent(frameId)}`;
}

export function compileRoutes(
  source: NavigationSource,
  parentPath = '/',
  layouts:
    readonly LayoutDefinition[] = [],
  output: CompiledRoute[] = [],
): readonly CompiledRoute[] {
  const entries =
    resolveNavigationEntries(source);

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
        buildFrameRoutes(
          entry as FrameRouteDefinition,
        ),
        parentPath,
        layouts,
        output,
      );

      continue;
    }

    if (entry.kind === 'defined-frame') {
      const compiledFrameRoutes =
        compileRoutes(
          buildInternalFrameRoutes(
            entry,
            createInternalFramePath(
              entry.id,
            ),
          ),
          '/',
          layouts,
          [],
        );

      for (const compiledRoute of compiledFrameRoutes) {
        output.push({
          ...compiledRoute,
          addressPath: null,
        });
      }

      continue;
    }

    const path =
      joinRoutePath(
        parentPath,
        entry.path,
      );

    output.push({
      route: entry,
      path,
      addressPath: path,
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
  readonly matchPath: string;
  readonly addressPath: string | null;
  readonly route: RouteDefinition;
  readonly frame: AnyFrameDefinition | null;
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
  source: NavigationSource,
): RouteRegistry {
  const namedRoutes =
    new Map<
      string,
      RouteRegistryRecord
    >();
  const declaredFrameIds =
    new Map<string, AnyFrameDefinition>();

  for (const frame of resolveDeclaredFrames(source)) {
    if (declaredFrameIds.has(frame.id)) {
      throw new Error(
        `Duplicate declared frame id "${frame.id}".`,
      );
    }

    declaredFrameIds.set(
      frame.id,
      frame,
    );
  }

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
    const {
      route,
      path,
      addressPath,
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

    if (
      !route.name
      || addressPath === null
    ) {
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
        fullPath: addressPath,
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
        matchPath:
          group.path,
        addressPath:
          group.primary.addressPath,
        route:
          group.primary.route,
        frame:
          declaredFrameIds.get(
            frameRoute.frameId,
          ) ?? null,
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

    if (
      declaredFrameIds.size > 0
      && !declaredFrameIds.has(record.frameId)
    ) {
      throw new Error(
        `Addressed frame "${record.frameId}" is not declared in the navigation definition.`,
      );
    }

    framesById.set(
      record.frameId,
      record,
    );

    if (
      defaultEntryPath === null
      && record.directEntry
      && record.addressPath !== null
    ) {
      defaultEntryPath =
        record.addressPath;
    }
  }

  for (const frameId of declaredFrameIds.keys()) {
    if (!framesById.has(frameId)) {
      throw new Error(
        `Declared frame "${frameId}" is not placed in the navigation entries.`,
      );
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
