# Switchboard protected frame build model

Switchboard uses the same deployment principle as Waypoint, but the protected unit is a **frame-graph contribution** rather than a route branch.

The application owns one root graph made only from `frameSlot()` declarations. Concrete public or protected graph sections live in exported `framesFor()` contributions. This keeps implementation modules out of the public Angular host graph.

```text
authored frame graph
       ↓
analyze frameSlot()/framesFor()
       ↓
frame artifact + dependency plan
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
export const routes = [
  frameSlot('public'),
  frameSlot('application'),
] as const satisfies NavigationTree;
```

and contribute implementation separately:

```ts
export const applicationFrames = framesFor('application', [
  frame('workspace', WorkspacePage, {
    address: '/workspace',
  }),
  frameSlot('administration'),
]);
```

The Builder derives artifact identity from the source module and exported contribution. Application code never supplies artifact ids.

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

Protected artifacts externalize Angular and Switchboard host modules. At runtime the generated host resolver registers those exact module namespaces so independently delivered artifacts do not create a second Angular or Switchboard identity.

The publication order is intentional: content-addressed artifacts are written first, server metadata is atomically swapped second, and stale artifacts are removed last. A failed public-host build publishes nothing.
