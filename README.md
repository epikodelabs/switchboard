# Switchboard

**Frame-first navigation for Angular.**

Switchboard models what the user can currently interact with as a **materialized tree of frames and Angular view scopes**. Navigation begins at the visible frame that initiated it, travels through that tree with **Relay**, and is projected to a location only after a visible frame accepts the target.

The architecture deliberately separates two responsibilities:

- **Switchboard navigates frames.** It owns the materialized `FrameTree`, logical outlet ownership, Relay propagation, frame/address projection, and protected contribution boundaries.
- **VanillaRouter navigates locations.** It remains the lower-level engine for URL matching, history, popstate, scroll restoration, route lifecycle, and rendering commits.

`VanillaRouter` is not a second frame graph. It receives the address selected by Switchboard and performs the location transition.

## Install

```bash
npm install @epikodelabs/switchboard
```

Switchboard supports standalone Angular applications and requires `@angular/core` and `@angular/common` 16 or later.

## Quick start

Define authored frames:

```ts
import { inject } from '@angular/core';
import {
  frame,
  provideFrameGraph,
  redirect,
  s,
} from '@epikodelabs/switchboard';

export const books = frame('books', '/books', BooksPage, {
  directEntry: true,
  transitions: ['account'],
  outlets: { sidebar: BooksSidebarComponent },
  prepare: async () => ({ books: await inject(BookService).list() }),
});

export const account = frame('account', '/accounts/:accountId', AccountPage, {
  params: { accountId: s.number({ min: 1 }) },
  transitions: ['books'],
});

export const frames = [
  redirect('/', books),
  frame('ledger', '/ledger', LedgerShellComponent, {
    transitions: ['books', 'account'],
    layout: [
      redirect('', books),
      books,
      account,
    ],
  }),
] as const;

export const appConfig = {
  providers: [...provideFrameGraph(frames)],
};
```

Render child branches with `FrameOutlet`:

```html
<frame-outlet name="sidebar" />
<frame-outlet />
```

A component rendered by an authored frame can inject its local `Relay`:

```ts
import { Component, inject } from '@angular/core';
import { Relay } from '@epikodelabs/switchboard';
import { account } from './app.frames';

@Component({
  standalone: true,
  template: '<button (click)="open()">Open account</button>',
})
export class BooksPage {
  private readonly relay = inject(Relay);

  open(): void {
    void this.relay.to(account, {
      params: { accountId: 42 },
    });
  }
}
```

`frame()` values are Relay targets because they carry their authored `kind: 'frame'` and `id`.

## The runtime model

Authored definitions describe what **may** exist. They are not the live runtime tree.

When views are rendered, Switchboard materializes concrete nodes:

```text
application outlet
└── ViewNode(AdminShell)
    ├── [sidebar] sidebar frame
    └── [default] ledger frame
        └── child frame
```

There are two kinds of materialized nodes:

- **`FrameNode`** represents a concrete authored frame. It has a stable frame id, copied transition declarations, and a local `Relay` capability.
- **`ViewNode`** mirrors an ordinary rendered Angular view scope. It owns nested outlets and participates in structural lifetime, but it has no frame id, no transitions, and no `Relay` of its own.

Relay walks through the same materialized ancestry but skips `ViewNode`s when looking for a frame that can accept a target.

This distinction matters for repeated view composition: an outlet inside a rendered Angular view belongs to that concrete view instance and must never be confused with the application root outlet.

## Relay navigation

Relay is peer-to-peer and origin-bound.

```text
origin frame
    │
    ▼
bubble through materialized parents
    │
    ▼
nearest authored frame whose transitions accept the target
    │
    ▼
FrameRuntime resolves target + input to an address
    │
    ▼
VanillaRouter performs the location transition
    │
    ▼
rendering updates the materialized FrameTree
```

Relay resolves against the **currently visible tree**, not against authored route ancestry and not against a parallel frame registry.

There is deliberately no global `navigate({ frame: 'settings' })` bypass. A frame transition must originate from a concrete visible frame.

## Address navigation

Address navigation is separate from frame navigation and remains available through `FrameRuntime`:

```ts
await runtime.navigate('/about');
await runtime.navigate({ path: '/about' });
await runtime.navigate({
  name: 'settings',
  query: { section: 'access' },
});
```

Use address navigation when the caller already owns a location-level intent. Use Relay when one visible frame is asking the application to move to another frame.

## Links

`FrameLink` supports both address targets and Relay frame targets. When given a frame target inside a rendered frame, it uses that frame's local Relay.

```html
<a [frameLink]="settings">Settings</a>
<a [frameLink]="{ path: '/about' }">About</a>
```

A frame target that cannot be resolved from the current Relay does not silently fall back to global frame-id navigation.

## Angular views and outlets

Angular components are the layout mechanism. `FrameOutlet` registers logical ownership through the current rendered Angular view scope; Switchboard does not reconstruct ownership with DOM traversal such as `closest('frame-host')`.

For path-prefixed Angular view composition, use `layout()` (or the equivalent `view()` spelling):

```ts
import { layout } from '@epikodelabs/switchboard';

export const admin = layout('/admin', AdminLayout, [
  settings,
  users,
]);
```

`layout()` and `view()` are both supported first-class helpers and produce the same Angular view-composition definition.

Primary and named outlets are structural branches:

```html
<frame-outlet />
<frame-outlet name="sidebar" />
```

Outlet names are not globally unique. The runtime resolves outlets using their concrete owner in the live tree, and router commits are kept separate from nested frame-composition outlets.

## Authored definitions vs. materialized tree

Keep these two concepts separate:

```text
authored frames / frameSlot / framesFor
        │
        └── definitions, delivery, authorization boundaries

materialized FrameTree / FrameOutlet / Relay
        │
        └── concrete visible instances and navigation now
```

The authored definitions are compiled into address/delivery information. The materialized `FrameTree` is the sole runtime source of frame parent/child relationships.

## Server-delivered frame contributions

For applications where browser disclosure of a feature branch is authorization-sensitive, split authored definitions into server-controlled contribution slots.

`frameSlot()` declares a contribution boundary and `framesFor()` supplies definitions for that slot:

```ts
import { frame, frameSlot, framesFor } from '@epikodelabs/switchboard';

export const frames = [frameSlot('application')] as const;

export const applicationFrames = framesFor('application', [
  frame('workspace', '/workspace', WorkspacePage, {
    policy: { roles: ['member'] },
  }),
] as const);
```

These APIs describe what definitions may be delivered. They do **not** describe the visible runtime tree.

`@epikodelabs/switchboard-builder` discovers contributions, creates isolated content-addressed artifacts, verifies protected source is absent from the public host, and publishes metadata for the server host. The server authorizes the dependency chain; the browser imports only the contributions it is allowed to receive.

```ts
import { provideServerFrameGraph } from '@epikodelabs/switchboard';
import { resolveFrames } from './switchboard.generated/resolver';

providers: [
  ...provideServerFrameGraph(frames, { resolveFrames }),
]
```

Do not serve generated `protected/` artifacts as public static files.

## Responsibility split

| Concern | Owner |
| --- | --- |
| Concrete visible frame/view instances | `FrameTree` |
| Parent/child structural relationships | `FrameTree` |
| Logical outlet ownership | `FrameTree` |
| Frame-to-frame propagation | `Relay` / `RelayRuntime` |
| Target-to-address projection | `FrameRuntime` |
| URL matching and navigation | `VanillaRouter` |
| History / popstate / scroll | `VanillaRouter` |
| Rendering commits and route lifecycle | `VanillaRouter` |
| Protected definition contributions | `frameSlot()` / `framesFor()` |

## Architectural invariants

1. The materialized `FrameTree` is the sole runtime model of frame relationships.
2. Relay starts from a concrete authored frame instance and bubbles only through live materialized ancestry.
3. `ViewNode`s own Angular view structure but never become Relay endpoints.
4. Frame ids identify authored definitions; `FrameNode` identity identifies concrete rendered frame instances.
5. Outlet ownership is explicit and structural, never inferred from DOM ancestry.
6. No parallel static frame graph is used for Relay resolution.
7. No global frame-id navigation bypasses Relay.
8. Frame navigation and address navigation are separate APIs.
9. `VanillaRouter` remains the lower-level location engine.

## Repository

- `projects/libraries/switchboard` — Switchboard library and tests.
- `projects/apps/app1` — standalone Angular demo of the materialized-tree/Relay model.
- `projects/tools/builder` — build-time tooling for protected/server-delivered frame definitions.

Additional documentation:

- `docs/build-model.md` — compiler and publication boundary.
- `docs/server-delivery.md` — runtime resolution and authorization.
- `docs/server-delivery-contract.md` — server/client delivery protocol.
- `docs/choosing-a-navigation-library.md` — intended use cases and trade-offs.

## Development

```bash
npm run build
npm test
npm run build:builder
```

## License

MIT


## Updating to 1.0.7

- [Switchboard 1.0.7 Angular view-layout changes](docs/migration-1.0.7.md)
- [Switchboard 1.0.6 navigation changes](docs/migration-1.0.6.md)
