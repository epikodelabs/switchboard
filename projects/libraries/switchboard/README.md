# @epikodelabs/switchboard

**Frame-first navigation for Angular.**

Switchboard models the application the user can currently interact with as a **materialized tree of authored frames and Angular view scopes**. Authored frames describe possible product states; rendering turns those definitions into concrete runtime nodes. Navigation between visible frames is performed by **Relay** through that materialized tree.

`VanillaRouter` is intentionally separate and constant: it remains the location engine responsible for URL matching, history, popstate, scroll restoration, route lifecycle, view transitions, and rendering commits.

> **Switchboard navigates frames. VanillaRouter navigates locations.**

## The model

An authored `frame()` definition describes a possible application state. Once rendered, it becomes a concrete `FrameNode` in the runtime `FrameTree`.

Ordinary rendered Angular views receive structural `ViewNode`s so their outlets have an explicit owner. A `ViewNode` is not a frame: it has no frame id, no transition declarations, and no `Relay` capability of its own.

```text
application outlet
└── ViewNode(AdminLayout)
    ├── [sidebar] sidebar frame
    └── [default] ledger frame
        └── child frame
```

The tree contains **render instances**, not authored definitions. Two instances of the same frame definition are different runtime nodes.

Parent/child ownership is explicit. It is not reconstructed from authored route ancestry and is not inferred from DOM ancestry.

## Authored definitions are not the runtime tree

The authored navigation definitions passed to `provideFrameGraph()` are definition/build input. They describe addresses, views, transitions, redirects, layouts, policies, and delivery boundaries.

They are compiled into the information needed to resolve addresses and load definitions, but Relay does not navigate that authored structure.

The runtime relationship model is only:

```text
FrameTree
├── concrete authored FrameNode instances
└── structural Angular ViewNode instances
```

This distinction is fundamental to decentralized navigation: Relay follows what is **actually materialized now**.

## Relay navigation

`Relay` is an origin-bound capability injected into a materialized authored frame. It is not a route service and does not maintain another navigation graph.

```ts
import { inject } from '@angular/core';
import { Relay } from '@epikodelabs/switchboard';
import { account } from './app.frames';

const relay = inject(Relay);

await relay.to(account, {
  params: { accountId: 42 },
  query: { tab: 'activity' },
  state: { source: 'books' },
});
```

A `frame()` value is structurally a Relay target because it carries `kind: 'frame'` and its authored `id`.

Resolution starts at the concrete `FrameNode` that owns the Relay and bubbles through its materialized parents:

```text
origin authored frame
        ↑
structural parent
        ↑
structural parent
        ↑
nearest authored frame whose transitions accept target
```

`ViewNode`s remain in structural ancestry for ownership/lifetime, but Relay skips them; only authored `FrameNode`s can accept a transition.

After a target is accepted, `FrameRuntime` projects the target and payload to an address and delegates the location transition to `VanillaRouter`. Rendering then updates the materialized tree.

There is deliberately no global `navigate({ frame: '...' })` escape hatch. Frame-to-frame navigation belongs to Relay and must originate from a concrete visible frame.

## Defining frames

```ts
import { frame, redirect } from '@epikodelabs/switchboard';

export const books = frame('books', '/books', BooksPage, {
  transitions: ['account'],
});

export const account = frame('account', '/accounts/:accountId', AccountPage, {
  transitions: ['books'],
});

export const frames = [
  redirect('/', books),
  frame('ledger', '/ledger', LedgerShellPage, {
    transitions: ['books', 'account'],
    layout: [
      redirect('', books),
      books,
      account,
    ],
  }),
] as const;
```

`transitions` belongs to the authored frame definition and is copied onto each materialized authored `FrameNode`. Relay therefore checks reachability against the visible instance tree without consulting a parallel frame registry.

## Angular view composition

Angular components are the layout mechanism. For a path-prefixed Angular view that hosts child frames, use `view()`:

```ts
import { view } from '@epikodelabs/switchboard';

export const admin = view('/admin', AdminLayout, [
  settings,
  users,
]);
```

`view()` is the single public composition helper in 1.0.7. At runtime `AdminLayout` receives a structural `ViewNode`, and its primary outlet belongs to that concrete Angular view scope:

```html
<header>Admin</header>
<frame-outlet />
```

This prevents a nested Angular view outlet from being confused with the application root during later navigations or view re-renders.

## Outlets

Use `FrameOutlet` to attach structural branches:

```html
<frame-outlet name="sidebar" />
<frame-outlet />
```

Every outlet is registered with its logical runtime owner: either an authored `FrameNode`, an Angular `ViewNode`, or `null` for an application-level outlet.

Switchboard does not use `closest('frame-host')` or other DOM traversal to discover ownership.

Outlet names are not globally unique. The same name may exist in multiple visible branches; resolution is based on the concrete materialized ownership context.

Nested frame-composition outlets and VanillaRouter commit targets are distinct responsibilities. A node can never be committed into one of its own descendant outlets.

## Links

`FrameLink` supports both address targets and Relay targets. A frame target uses the current frame's Relay when one is available.

```html
<a [frameLink]="settings">Settings</a>
<a [frameLink]="{ path: '/about' }">About</a>
```

A frame target that the current Relay cannot resolve does not fall back to global frame-id navigation.

## Address navigation

Address navigation is separate and remains available through `FrameRuntime`:

```ts
await runtime.navigate('/about');
await runtime.navigate({ path: '/about' });
await runtime.navigate({
  name: 'settings',
  query: { section: 'access' },
});
```

This is location-level navigation, not a substitute for Relay-based frame navigation.

## Providing the graph

```ts
import { provideFrameGraph } from '@epikodelabs/switchboard';
import { frames } from './app.frames';

export const appConfig = {
  providers: [
    ...provideFrameGraph(frames, { viewTransitions: true }),
  ],
};
```

`provideServerFrameGraph()` is also exported for server-delivered configurations.

## Server-delivered frame contributions

`frameSlot()` and `framesFor()` are authoring/build-time contribution boundaries. They describe which frame definitions may be delivered into a protected slot; they do **not** represent the visible runtime tree.

```text
frameSlot / framesFor
        ↓
allowed and delivered authored definitions

FrameTree / FrameOutlet / Relay
        ↓
concrete visible structure right now
```

Example:

```ts
import { frame, frameSlot, framesFor } from '@epikodelabs/switchboard';

export const frames = [frameSlot('application')] as const;

export const applicationFrames = framesFor('application', [
  frame('workspace', '/workspace', WorkspacePage, {
    policy: { roles: ['member'] },
  }),
] as const);
```

## Runtime responsibilities

| Concern | Owner |
| --- | --- |
| Concrete visible frame/view instances | `FrameTree` |
| Parent/child structural relationships | `FrameTree` |
| Logical outlet ownership | `FrameTree` |
| Frame-to-frame propagation | `Relay` / `RelayRuntime` |
| Target-to-address projection | `FrameRuntime` |
| URL matching and navigation | `VanillaRouter` |
| History / popstate / scroll | `VanillaRouter` |
| Rendering commits / route lifecycle | `VanillaRouter` |
| Protected contribution boundaries | `frameSlot()` / `framesFor()` |

## Updating to 1.0.7

Switchboard 1.0.7 aligns non-frame layout ownership with Angular view scopes through structural `ViewNode`s and uses `view()` as the single public composition helper. See [1.0.7 Angular view-layout changes](../../docs/migration-1.0.7.md).

For the Relay navigation changes introduced previously, see [1.0.6 navigation changes](../../docs/migration-1.0.6.md).

## Architectural invariants

1. The materialized `FrameTree` is the sole runtime model of frame relationships.
2. Relay starts from a concrete authored frame node and bubbles only through live materialized ancestry.
3. `ViewNode`s own Angular view structure but never become Relay endpoints.
4. Frame ids identify authored definitions; `FrameNode` identity identifies concrete rendered instances.
5. Outlet ownership is logical and explicit, never inferred from DOM ancestry.
6. A frame/view host is never committed into an outlet contained by that same host.
7. No parallel static frame graph is used for Relay resolution.
8. No global frame-id navigation bypasses Relay.
9. Address navigation and frame navigation are separate APIs.
10. `VanillaRouter` remains the lower-level location engine.

These invariants are the core of Switchboard's decentralized navigation model.
