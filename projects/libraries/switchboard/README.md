# Switchboard

Switchboard is a frame-first Angular navigation library.

Instead of treating the URL as the primary model, Switchboard lets you define a graph of frames and then project public addresses onto the parts of that graph that should be directly addressable.

## Core Ideas

### `frame(...)`

A frame is the primary navigation unit.

It owns:

- a stable frame id
- the rendered view
- typed params and query schemas
- optional companion outlets
- allowed transitions to other frames
- direct-entry rules

### `view(...)` and `lazyView(...)`

A view binds a component to frame lifecycle behavior such as `prepare`.

### `address(...)`

An address projects a public path onto a frame.

Not every frame needs one. Internal frames can exist in the graph without being directly addressable from the URL.

### `navigation(...)`

`navigation(...)` collects the frame catalog and the address/layout entries that expose parts of that catalog.

### `layout(...)`

Layouts compose shell UI around address entries. They are composition boundaries, not the source of frame identity.

## Example

```ts
import { inject } from '@angular/core';
import {
  address,
  frame,
  frameOutlet,
  layout,
  navigation,
  s,
  view,
} from '@epikodelabs/switchboard';

const missionFrame = frame(
  'mission',
  view(MissionPage, {
    prepare: [
      async context => ({
        snapshot: await inject(MissionService).load(
          Number(context.params['missionId'] ?? 0),
        ),
      }),
    ],
  }),
  {
    directEntry: true,
    transitions: ['analysis', 'handoff'],
    paramsSchema: {
      missionId: s.number({ min: 1 }),
    },
    querySchema: {
      lane: s.string('thermal'),
    },
    outlets: [
      frameOutlet('sidebar', view(MissionSidebarComponent)),
    ],
  },
);

const handoffFrame = frame(
  'handoff',
  view(HandoffPage),
  {
    transitions: ['mission', 'analysis', 'debrief'],
  },
);

export const routes = navigation({
  frames: [
    missionFrame,
    handoffFrame,
  ] as const,
  entries: [
    layout('/ops', view(OpsShellPage), [
      address('/mission/:missionId', missionFrame),
      handoffFrame,
    ]),
  ] as const,
});
```

In that model:

- `mission` is publicly addressable
- `handoff` is part of the frame graph but has no public address
- transitions define where navigation is allowed to move next

## What The Current App Demonstrates

See `projects/apps/app1` for a working reference of:

- addressable frames
- internal-only frames
- named outlet companions declared per frame
- lazy frame loading
- payload transfer through `history.state`
- direct-entry rejection and redirect
- frame-first navigation under a shell layout

Start there with:

- `projects/apps/app1/src/app/app.routes.ts`
- `projects/apps/app1/src/app/frames`

## Notes

Switchboard still supports route-style concerns such as paths, redirects, params, and query parsing. The difference is that these are projections and policies around frames, not the primary source of truth.

If you need broad Angular Router feature parity, Switchboard is intentionally narrower. It is a better fit when you want:

- explicit frame identity
- transition-constrained navigation
- functional lifecycle hooks
- typed navigation and address generation
- shell composition without adopting Angular Router's full route-tree model
