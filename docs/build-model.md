# Switchboard protected frame-definition build model

Switchboard uses the same deployment principle as Waypoint, but the protected unit is a **frame-definition contribution** rather than a route branch.

This is a build-time and delivery-time model. It is deliberately separate from the runtime `FrameTree`: `frameSlot()` and `framesFor()` decide which authored definitions may be shipped to the browser, while the `FrameTree` contains only concrete render instances that are actually materialized. Ordinary rendered Angular views may therefore appear in the runtime tree as structural `ViewNode`s even though they are not protected-delivery artifacts.

Path-prefixed Angular composition is authored with `view()`. The protected-delivery analyzer recognizes `view()` directly; Angular components remain responsible for the actual rendered layout.

The public application entry owns a root definition tree made only from `frameSlot()` declarations. Concrete public or protected definitions live in exported `framesFor()` contributions. This keeps implementation modules out of the public Angular host graph.

```text
root definition entry
       ↓
analyze frameSlot()/framesFor()
       ↓
definition artifact + dependency plan
       ↓
full-AOT compile contribution modules
       ↓
Angular public host build
       ↓
host-isolation check
       ↓
content-addressed protected artifacts
       ↓
atomic server metadata publication
```

The build owner is `@epikodelabs/switchboard-builder`. Its Angular builder is `@epikodelabs/switchboard-builder:switchboard-build`.

A protected-delivery application should use an entry shaped like:

```ts
export const frames = [
  frameSlot('public'),
  frameSlot('application'),
] as const satisfies NavigationTree;
```

and contribute implementation separately:

```ts
export const applicationFrames = framesFor('application', [
  frame('workspace', '/workspace', WorkspacePage, {
    policy: { roles: ['member'] },
  }),
  frameSlot('administration'),
]);
```

`frameSlot()` establishes a contribution boundary. `framesFor()` supplies authored definitions for that boundary. Neither primitive describes the currently visible parent/child tree.

The builder derives artifact identity from the source module and exported contribution. Application code never supplies artifact ids.

Output layout:

```text
dist/<app>/
  browser/                 public Angular host
  protected/               never serve statically
  .switchboard/
    manifest.json
    server/
      server-index.json
      shards/*.json
```

The generated server metadata records contribution dependencies, frame ids, address-resolvable branches, policies, hashes, and physical artifact files. It is an authorization and delivery index, not a serialized runtime `FrameTree`.

Protected artifacts externalize Angular and Switchboard host modules. At runtime the generated host resolver registers those exact module namespaces so independently delivered artifacts do not create a second Angular or Switchboard identity.

After authorization, the browser receives `framesFor()` contributions. `FrameRuntime` combines those contributions with the root slot entry and recompiles the active definition source used for address matching. Only rendering materializes `FrameNode` instances and their outlet ownership.

The publication order is intentional: content-addressed artifacts are written first, server metadata is atomically swapped second, and stale artifacts are removed last. A failed public-host build publishes nothing.
