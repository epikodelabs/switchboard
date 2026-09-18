# @epikodelabs/switchboard

**Frame-first navigation for Angular.**

Switchboard models the application the user can currently interact with as a **materialized tree of frames**. A frame can own child frames through outlets, declare which peer frames it can transition to, carry lifecycle behavior, and project to a URL. Navigation between frames is performed by **Relay** through that visible tree.

`VanillaRouter` is intentionally separate and constant: it remains the location engine responsible for URL matching, history, popstate, scroll restoration, route lifecycle, and rendering.

## The model

A frame definition describes a possible part of the application. Once rendered, it becomes a concrete `FrameNode` in the runtime `FrameTree`. Rendered layout shells also receive anonymous structural nodes so their outlets have an explicit owner; only authored frames carry a frame id and a `Relay` capability.

```text
ledger
├── [sidebar] books-sidebar
└── [default] books
                 └── ...
```

The tree contains only materialized render instances: authored frame nodes plus anonymous structural layout nodes. Parent/child ownership is explicit; it is not reconstructed from authored route ancestry or inferred from DOM ancestry. Two instances of the same frame definition are therefore distinct runtime nodes.

Named outlets are branches owned by their materialized frame. Outlet names are not globally unique: when the same outlet name exists at several levels, Switchboard resolves it in the live frame tree.

## Relay navigation

`Relay` is an origin-bound capability injected into a materialized frame. It does not represent a route and does not maintain a second navigation graph.

```ts
import { Relay } from '@epikodelabs/switchboard';

const relay = inject(Relay);

await relay.to({ kind: 'frame', id: 'account' }, {
  params: { accountId: 'a-1000' },
  query: { tab: 'activity' },
  state: { source: 'books' },
});
```

Resolution starts at the concrete frame that owns the Relay and bubbles through its materialized parents. The nearest visible frame whose authored `transitions` includes the target accepts the request.

```text
origin
  ↑
parent
  ↑
parent
  ↑
first accepting frame
```

After acceptance, `FrameRuntime` projects the target frame and payload to an address and delegates the actual location navigation to `VanillaRouter`. Rendering then mounts and removes nodes in `FrameTree`.

There is deliberately no global `navigate({ frame: '...' })` escape hatch. Frame-to-frame navigation belongs to Relay and the visible tree.

## Defining frames

```ts
import { frame, redirect } from '@epikodelabs/switchboard';

export const frames = [
  redirect('/', booksFrame),

  frame('ledger', '/ledger', LedgerShellPage, {
    transitions: ['books', 'account', 'journal', 'settings'],
    layout: [
      redirect('', booksFrame),
      booksFrame,
      accountFrame,
      journalFrame,
      settingsFrame,
    ],
  }),
] as const;
```

`transitions` belongs to the frame definition but is copied onto each materialized `FrameNode`. Relay therefore evaluates reachability from the actual visible tree rather than consulting a parallel route registry.

## Outlets

Use `FrameOutlet` to attach a child branch to the current frame:

```html
<frame-outlet name="sidebar" />
<frame-outlet />
```

Outlet ownership is supplied explicitly by the current frame scope. Switchboard does not use `closest('frame-host')` or other DOM traversal to discover frame relationships.

## Links

`FrameLink` supports both address links and frame targets. A frame target uses the current frame's Relay when one is available.

```html
<a [frameLink]="{ name: 'settings' }">Settings</a>
```

Address navigation remains available directly through `FrameRuntime`:

```ts
await runtime.navigate('/about');
await runtime.navigate({ path: '/about' });
await runtime.navigate({ name: 'settings', query: { section: 'access' } });
```

This is address navigation, not a substitute for Relay-based frame navigation.

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

`provideServerFrameGraph` is also exported for server-delivered configurations.

## Server-delivered frame contributions

`frameSlot()` and `framesFor()` are authoring/build-time contribution boundaries. They answer which frame definitions may be delivered into a protected slot; they do **not** represent the currently visible runtime tree.

That separation is intentional:

```text
frameSlot / framesFor  → allowed/delivered definitions
FrameTree / FrameOutlet → materialized frames visible now
```

## Runtime responsibilities

The final ownership split is:

| Concern | Owner |
| --- | --- |
| Materialized frame instances | `FrameTree` |
| Parent/child relationships | `FrameTree` |
| Logical outlet ownership | `FrameTree` |
| Frame-to-frame propagation | `Relay` / `RelayRuntime` |
| Target-to-address projection | `FrameRuntime` |
| URL matching and navigation | `VanillaRouter` |
| History / popstate / scroll | `VanillaRouter` |
| Rendering and route lifecycle | `VanillaRouter` |
| Protected contribution boundaries | `frameSlot()` / `framesFor()` |

## Architectural invariants

1. The materialized `FrameTree` is the sole runtime model of frame relationships.
2. Relay bubbles only through live materialized nodes.
3. Frame IDs identify authored definitions; `FrameNode` identity identifies concrete visible instances, including anonymous layout owners.
4. Outlet ownership is logical and explicit, never inferred from DOM ancestry.
5. No parallel static frame graph is used for Relay resolution.
6. No global frame-ID navigation bypasses Relay.
7. Address navigation and frame navigation are separate APIs.
8. `VanillaRouter` remains the lower-level location engine.

These invariants are the core of Switchboard's decentralized navigation model.
