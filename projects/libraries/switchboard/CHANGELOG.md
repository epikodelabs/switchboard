# Changelog

## 1.0.6

Switchboard 1.0.6 moves frame navigation onto Relay and the materialized visible frame tree.

### Compatibility changes

- Frame-to-frame navigation now originates from an injected `Relay` bound to a concrete visible authored frame instance.
- Global frame-id navigation (`navigate({ frame: ... })`) is removed. Use Relay for frame transitions and `FrameRuntime.navigate(...)` for address navigation.
- `FrameNavigator` is replaced by `FrameRuntime`.
- Runtime frame ownership no longer comes from authored/static ancestry. `FrameTree` is the authoritative live ownership model.
- `FrameNode.frameId` may be `null` for anonymous structural layout nodes. These nodes own outlets but do not receive Relay capabilities or transition declarations.

### Reliability

- Prevent self-descendant outlet placement during router commits.
- Resolve staged outlet placements before DOM mutation.
- Cleanly replace repeated layout and named-outlet navigations.
- Roll back structural nodes, injectors, components, and outlets when render construction or composition fails.
- Remove outlets owned by a branch immediately when that branch leaves `FrameTree`.
- Reject invalid tree ownership operations before they can corrupt Relay propagation.
- Use `DestroyRef` for Angular-compatible scoped cleanup.

### Documentation

- Reworked README and server-delivery documentation around the materialized-tree Relay model.
- Clarified that authored/server-delivered definitions are not the live runtime tree.
