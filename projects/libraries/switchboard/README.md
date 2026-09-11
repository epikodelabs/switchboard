# @epikodelabs/switchboard

Frame-first navigation primitives for standalone Angular applications.

Switchboard models an application as named frames. A frame owns lifecycle hooks, named companion outlets, child frames, transition rules, an optional server-delivery policy, and its URL projection. This keeps the navigation contract close to the feature it describes instead of spreading it among a URL table, guards, and component wiring.

```bash
npm install @epikodelabs/switchboard
```

Peer dependencies: `@angular/core` and `@angular/common` `>=16.0.0`.

## Minimal example

```ts
import { frame, provideFrameGraph, s } from '@epikodelabs/switchboard';

const profile = frame('profile', '/profiles/:id', ProfilePage, {
  directEntry: true,
  params: { id: s.number({ min: 1 }) },
  query: { tab: s.string('overview') },
  prepare: async context => ({
    profile: await profileApi.get(Number(context.params['id'])),
  }),
});

export const frames = [
  profile,
] as const;

export const providers = [...provideFrameGraph(frames)];
```

Use `FrameOutlet` to host the primary or named frame outlet. Components rendered by a frame inject their local `Relay` and call `relay.to(targetFrame, input)`. `FrameLink` accepts the same frame targets. Relay requests resolve peer-to-peer: direct connections are preferred, otherwise the request bubbles through structural frame owners until a declared transition accepts it, then cascades to the destination. The vanilla router remains an internal URL projection; application code should address frames.

## API at a glance

| API | Role |
| --- | --- |
| `frame()` | Define a self-contained application frame and its URL projection. |
| `redirect()` | Define a redirect frame that targets another frame. |
| `Relay` | Local frame-to-frame navigation endpoint for rendered components. |
| `FrameLink` | Anchor directive for frame targets and URL targets. |
| `s` | Runtime schemas and inferred types for URL values. |
| `frameSlot()` / `framesFor()` | Declare server-delivery ownership boundaries. |
| `provideFrameGraph()` / `provideServerFrameGraph()` | Install the frame graph and, optionally, a generated resolver. |

## Frame Graph

The `frames` array is the only authored navigation tree. A frame owns its
identity, URL projection, transitions, outlets, and lifecycle hooks. The
runtime route table is compiled from the frame tree.

```ts
const account = frame('account', '/accounts/:id', AccountPage, {
  params: { id: s.number({ min: 1 }) },
  transitions: ['books'],
});

export const frames = [
  frame('app', '/app', AppShellComponent, {
    children: [
      account,
    ],
  }),
] as const;
```

Inside a rendered frame component:

```ts
import { Component, inject } from '@angular/core';
import { Relay } from '@epikodelabs/switchboard';

@Component({ standalone: true, template: '<button (click)="open()">Open</button>' })
export class BooksPage {
  private readonly relay = inject(Relay);

  open(): void {
    void this.relay.to(account, { params: { id: 42 } });
  }
}
```

Server delivery is opt-in. The companion builder turns `framesFor()` contributions into protected artifacts, and the host server authorizes their delivery. See the repository [README](../../../README.md) for the model, templates, and full documentation links.
