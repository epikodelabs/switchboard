# Switchboard Server Frame Delivery Contract

The server is the disclosure boundary. A browser may know a frame address, frame id, or artifact key and still must not receive an unauthorized graph artifact.

The generated server index describes each frame-set artifact, its ownership dependencies, content hash, physical file, slot id, frame ids, and addressable frame branches. Shards contain the address prefixes and inherited frame policies used by a server adapter to resolve a request.

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

Artifacts are returned dependency-first. `createServerFrameResolver()` imports them, validates that each default export is a `framesFor()` contribution for the expected slot, rebinds compiler-owned identity, and returns the authorized contribution set.

A `404` intentionally covers both unknown and unauthorized destinations. Client lifecycle hooks are not a security boundary.
