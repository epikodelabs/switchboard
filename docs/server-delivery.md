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

The runtime package exposes `authorizeFrameArtifacts()` and
`resolveDeliveredFrames()` as the server/client-neutral delivery contract. Build
isolation and physical artifact emission belong to the Switchboard builder layer.
