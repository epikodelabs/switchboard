# Switchboard Server Frame Delivery Contract

The server is the disclosure boundary. A browser may know a frame address, frame id, or artifact key and still must not receive an unauthorized definition artifact.

This protocol delivers authored frame definitions. It does **not** serialize or transmit the materialized runtime `FrameTree`, Relay paths, or outlet ownership.

The generated server index describes each frame-contribution artifact, its ownership dependencies, content hash, physical file, slot id, frame ids, and address-resolvable branch ids. Shards contain address prefixes and inherited frame policies used by a server adapter to resolve a request.

A successful resolve response has this logical shape:

```json
{
  "artifactKey": "src/app/frames/administration#administrationFrames",
  "artifacts": [
    {
      "artifactKey": "src/app/frames/application#applicationFrames",
      "moduleUrl": "/api/navigation/artifacts/application-abc123.js",
      "hash": "abc123",
      "slotId": "application"
    },
    {
      "artifactKey": "src/app/frames/administration#administrationFrames",
      "moduleUrl": "/api/navigation/artifacts/administration-def456.js",
      "hash": "def456",
      "slotId": "administration"
    }
  ]
}
```

`artifactKey` identifies the requested contribution. `artifacts` is returned dependency-first so parent contribution dependencies are available before the requested contribution is installed.

`createServerFrameResolver()` imports each module, validates that its default export is a `framesFor()` contribution for the expected slot, rebinds the contribution id to the compiler-owned artifact key, and returns:

```ts
{
  contributions,
  contributionIdentities
}
```

`FrameRuntime` installs those definitions into their declared slots and rebuilds the browser-side definition source/address catalog. Materialized `FrameNode` instances still arise only from rendering.

A `404` intentionally covers both unknown and unauthorized destinations so resolution does not disclose which protected definition exists. Client lifecycle hooks, Relay transitions, hidden links, and missing menu items are not security boundaries; backend/API authorization remains independent.
