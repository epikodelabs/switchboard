# Switchboard server delivery

Switchboard keeps the frame graph as the navigation model while using the same
security boundary as Waypoint: the server decides which frontend graph artifacts
a principal is allowed to receive.

The authored graph has two ownership primitives:

```ts
frameSlot('administration')

framesFor('administration', [
  frame('admin', AdminPage, {
    address: '/admin',
    policy: {
      roles: ['admin'],
      permissions: ['admin:read'],
    },
  }),
])
```

`frameSlot()` describes an ownership boundary. `framesFor()` contributes a graph
fragment to it. Application code does not need to name artifact identities in a
protected-delivery build; the compiler/server layer owns that identity.

The active navigation graph is resolved from the root graph plus only the
contributions authorized for the current principal. A frame that is not delivered
does not exist in the browser graph, so transitions to it are unavailable too.

This graph ownership relation is deliberately independent from transition edges:

```text
artifact ownership graph != navigation transition graph
```

Policies control frontend artifact disclosure. They do not replace backend/API
authorization.

The runtime package exposes `createServerFrameResolver()` for the browser half of
the delivery contract. Build isolation and physical artifact emission belong to
the Switchboard builder layer.

## Server host templates

Switchboard ships the protected-delivery protocol with two distributable starter
hosts under `templates/`:

- `server-node-ts` packages as `@epikodelabs/switchboard-template-node-ts` and can
  scaffold an Express + TypeScript host with `npx`.
- `server-aspnet-core` packages as `EpikodeLabs.Switchboard.Templates` and installs
  a `dotnet new switchboard-server-aspnet` template.

Both consume the same `.switchboard/server/server-index.json` generation and expose
identical resolve/module endpoints. Framework-specific code is intentionally limited
to principal extraction, HTTP response handling, and file delivery; frame matching,
dependency ordering, and authorization semantics are equivalent.

Templates are release artifacts, not live dependencies of application builds. Pack
them with `npm run pack:templates` when both Node/npm and the .NET SDK are available,
or use `pack:template:node` / `pack:template:aspnet` independently.
