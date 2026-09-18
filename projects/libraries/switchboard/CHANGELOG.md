# Changelog

## 1.0.7

### Angular view ownership

- Angular component layouts are represented at runtime by structural `ViewNode`s instead of anonymous frame nodes.
- Authored navigation states remain `FrameNode`s with real frame ids, transition declarations, and Relay capability.
- Relay traverses the materialized ownership tree but skips `ViewNode`s when looking for a frame that can accept a target.
- `layout()` remains a first-class public authoring helper.
- Added `view()` as an equivalent Angular-view spelling; `layout()` and `view()` produce the same `LayoutDefinition` and runtime ownership model.

### Runtime hardening

- Roll back structural nodes, scoped injectors, components, and outlets when component construction or nested composition fails.
- Remove outlets immediately when their owning materialized node leaves `FrameTree` instead of waiting for later Angular directive teardown.
- Prevent router-target selection from using outlets whose owners have already left the materialized tree.
- Reject remounting removed nodes, mounting into disconnected or descendant-owned outlets, foreign outlet owners, and forged Relay origins before they can corrupt the runtime topology.
- Preserve the original render/navigation error when cleanup also fails.

### Builder and server delivery

- Protected-delivery analysis now understands both `layout()` and `view()` definitions.
- Kept build-time `frameSlot()` / `framesFor()` ownership separate from the materialized runtime `FrameTree`.

### Documentation

- Updated the root README and package README around Angular-owned view/layout composition.
- Added 1.0.7 migration/release notes covering `ViewNode`, `layout()` / `view()`, Relay ancestry, and release verification.
- Updated build/server-delivery documentation to keep authored definitions, delivered contributions, and materialized view ownership distinct.

## 1.0.6

### Navigation model

- Replaced the centralized `FrameNavigator` model with `FrameRuntime` + origin-bound `Relay` navigation.
- Frame-to-frame navigation now resolves through the materialized visible `FrameTree`.
- Removed global frame-id navigation such as `navigate({ frame: '...' })`; use Relay for frame transitions and `FrameRuntime.navigate(...)` for address navigation.
- Removed the parallel runtime frame/transition registry used for Relay resolution.
- Kept `VanillaRouter` as the unchanged lower-level URL/history/render engine.

### Runtime ownership

- Added `FrameTree` as the authoritative runtime model of rendered ownership.
- Relay bubbles from a concrete visible authored frame through materialized ownership and is accepted by the nearest authored frame whose local `transitions` declaration permits the target.
- Separated runtime outlet ownership from DOM ancestry, authored route ancestry, and server contribution ownership.

### Reliability

- Fixed nested primary and named outlet replacement across repeated layout navigations.
- Prevented a frame/layout host from being committed into one of its own descendant outlets.
- Resolve complete multi-outlet commit placement before mutating the DOM.
- Use `DestroyRef` for Angular-compatible scoped frame cleanup.

### Server delivery

- Kept `frameSlot()` / `framesFor()` as build/delivery ownership boundaries while separating them from the materialized runtime tree.
- Clarified that server resolution controls available authored definitions, not materialized UI state.

### Documentation

- Reworked the root and package READMEs around the materialized-tree Relay model.
- Updated build-model, server-delivery, delivery-contract, and navigation-library comparison documentation.
- Added a 1.0.6 migration/compatibility guide for the navigation API changes.
