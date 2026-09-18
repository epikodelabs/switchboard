# Switchboard server delivery

Switchboard uses the same disclosure boundary as Waypoint: the server decides which **frame-definition artifacts** a principal is allowed to receive.

Protected delivery is deliberately separate from runtime navigation ownership:

```text
frameSlot() / framesFor()     → authored definition delivery
FrameTree / FrameOutlet       → materialized UI ownership
Relay                         → frame-to-frame propagation through the visible tree
VanillaRouter                 → URL/history/render transaction
```

The protected definition model has two composition primitives:

```ts
frameSlot('administration')

framesFor('administration', [
  frame('admin', '/admin', AdminPage, {
    policy: {
      roles: ['admin'],
      permissions: ['admin:read'],
    },
  }),
])
```

`frameSlot()` describes a compiler/server-owned contribution boundary. `framesFor()` contributes authored definitions to that boundary. Application code does not name artifact identities in a protected-delivery build; the compiler/server layer owns those identities.

For a requested address, the server resolves the authorized artifact dependency chain. The browser imports the returned `framesFor()` contributions, and `FrameRuntime` combines them with the root slot entry to rebuild its active definition source and address catalog.

Until a contribution is delivered, its frame definitions are absent from that browser-side definition source. They therefore cannot be rendered or addressed by that client. Delivery does not itself materialize anything: concrete `FrameNode` instances are created only when views render.

Three relationships must stay distinct:

```text
artifact ownership/dependency graph
              !=
authored transition declarations
              !=
materialized FrameTree
```

Artifact ownership answers **which definitions may be delivered together**. Authored `transitions` answer **which targets an authored frame may accept**. `FrameTree` answers **which concrete frame/view instances are visible now and who owns their outlets**.

Policies control frontend artifact disclosure. They do not replace backend/API authorization.

The runtime package exposes `createServerFrameResolver()` for the browser half of the delivery contract. It resolves an address through the server endpoint, imports the dependency-ordered artifacts, validates that each default export is a `framesFor()` contribution for the expected slot, binds compiler-owned artifact identity, and returns the authorized contribution set plus contribution identities.

`provideServerFrameGraph()` uses the same `FrameRuntime` as local definitions. Server delivery changes which authored definitions are available; it does not introduce a second runtime navigation graph.

Build isolation and physical artifact emission belong to the Switchboard builder layer.

## Server host templates

Switchboard ships the protected-delivery protocol with two distributable starter hosts under `templates/`:

- `server-node-ts` packages as `@epikodelabs/switchboard-template-node-ts` and can
  scaffold an Express + TypeScript host with `npx`.
- `server-aspnet-core` packages as `EpikodeLabs.Switchboard.Templates` and installs
  a `dotnet new switchboard-server-aspnet` template.

Both consume the same `.switchboard/server/server-index.json` generation and expose identical resolve/module endpoints. Framework-specific code is intentionally limited to principal extraction, HTTP response handling, and file delivery; frame matching, dependency ordering, and authorization semantics are equivalent.

Templates are release artifacts, not live dependencies of application builds. Pack them with `npm run pack:templates` when both Node/npm and the .NET SDK are available, or use `pack:template:node` / `pack:template:aspnet` independently.
