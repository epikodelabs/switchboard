# Switchboard

Switchboard is a frame-first Angular navigation library — and it makes routing feel like the good part of your app again.

Most routers ask you to start from the URL: define a path, hang a component off it, and then bolt on everything else (guards, data loading, nested outlets) around that path. Switchboard flips the order. You start by describing your app as a graph of **frames** — the places a user can actually be — and *then* you decide which of those places deserve a public address. The result is an app where navigation logic reads like a map of your product, not a list of strings.

The best part? You don't have to give anything up to get there. Switchboard still speaks fluent URLs — paths, redirects, typed params, typed query strings — it just treats them as a projection on top of your frame graph instead of the source of truth. If you already know Angular Router, you'll feel at home within a few minutes, and you'll probably never want to go back.

## Why you'll like it

- **Explicit frame identity.** Every screen your user can land on has a real, stable id — not just an implicit path segment. Refactor your URLs freely; your navigation logic keeps working.
- **Transition-constrained navigation.** Frames declare which other frames they're allowed to move to. Illegal jumps become type errors and runtime guards instead of production bugs.
- **Not every frame needs a URL.** Internal, mid-flow, or wizard-style screens can live in the graph without ever being directly linkable — and you can explicitly reject or redirect a direct entry attempt if someone tries anyway.
- **Typed all the way down.** Params and query strings are declared with a small schema builder (`s.string`, `s.number`, `s.boolean`, `s.array`, `s.date`) and the types flow straight into your navigation calls and generated links.
- **Functional lifecycle hooks.** `prepare`, `beforeEnter`, `beforeLeave`, and `afterEnter` are just functions — inject services, load data, guard a transition, all without ceremony.
- **Outlets that belong to the frame.** Companion UI like sidebars or docks is declared right on the frame that owns it, not wired up separately.
- **Shell composition without the whole route tree.** `layout(...)` lets you wrap shell UI around a set of addresses, so you get Angular Router-style composition without inheriting its full nested-route model.

If you want full Angular Router feature parity, Switchboard is intentionally narrower — and that's the point. It's built for apps where the *frame* is the thing you actually reason about, and the URL is just one of the ways in.

## Installation

```bash
npm install @epikodelabs/switchboard
```

Switchboard is built for modern, standalone Angular apps and has a single peer dependency on `@angular/core` and `@angular/common`.

## Quick start

```ts
import { inject } from '@angular/core';
import {
  frame,
  layout,
  navigation,
  redirect,
  s,
} from '@epikodelabs/switchboard';

const missionFrame = frame('mission', MissionPage, {
  address: '/mission/:missionId',
  directEntry: true,
  transitions: ['analysis', 'handoff'],
  params: {
    missionId: s.number({ min: 1 }),
  },
  query: {
    lane: s.string('thermal'),
  },
  outlets: {
    sidebar: MissionSidebarComponent,
  },
  prepare: async context => ({
    snapshot: await inject(MissionService).load(
      Number(context.params['missionId']),
    ),
  }),
});

const handoffFrame = frame('handoff', HandoffPage, {
  transitions: ['mission', 'analysis'],
});

export const routes = navigation({
  frames: [missionFrame, handoffFrame] as const,
  entries: [
    redirect('/', '/app/mission/1'),
    layout('/app', AppShell, [
      missionFrame,
      handoffFrame,
    ]),
  ] as const,
});
```

A frame owns its identity, URL projection, schemas, lifecycle, companion outlets,
and transition edges. Internal-only frames simply omit `address`.

## Core ideas

Switchboard is built from a handful of small, composable building blocks. Once these click, everything else in the library is just detail.

### `frame(id, view, options)`

A frame is the primary unit of navigation — the thing that actually exists in your app, whether or not it has a URL. A frame owns:

- a stable **frame id**, used everywhere you refer to it in code
- the **view** that renders it
- optional **typed params and query schemas**
- optional **companion outlets** (sidebars, docks, anything that rides alongside the main view)
- the list of **transitions** it's allowed to make to other frames
- **direct-entry rules**, for deciding whether someone is allowed to land here straight from a URL

### `frame(...)` lifecycle options

Lifecycle belongs directly to `frame(...)`: `prepare`, `beforeEnter`, `beforeLeave`, and `afterEnter` are plain functions. `view()` remains a low-level composition helper for reusable/lazy view definitions, but ordinary frames do not need it.

### Frame addresses

Set `address` on a frame to make it public and linkable. Omit it and the frame remains an internal graph state reachable through transitions without becoming a URL destination.

### `navigation({ frames, entries })`

`navigation(...)` is where it all comes together. It collects your full frame catalog alongside the address and layout entries that expose parts of that catalog to the outside world, and produces the routes Angular actually runs.

### `layout(path, view, entries, options)`

Layouts compose shell UI — navbars, side panels, app chrome — around a group of address entries. They're a composition boundary, not a source of frame identity: the frames underneath a layout are exactly as real, addressable (or not), and transition-constrained as they'd be anywhere else. `lazyLayout(...)` covers the code-split version.

### Typed navigation and links

Because params and query schemas are declared once on the frame (or address), Switchboard can generate fully typed navigation helpers and hrefs for you — `router.navigateTo(...)` and `router.hrefTo(...)` — plus a drop-in `RouterLink` directive for templates. Typo a frame id or forget a required param, and TypeScript will tell you before your users do.

### Query and param schemas, with `s`

The `s` helper builds small, declarative schemas for params and query strings: `s.string(default)`, `s.number({ min, max, default })`, `s.boolean(default)`, `s.array(default)`, `s.date(default)`, and `s.optional(schema)` to make any of the above optional. These schemas double as runtime coercion/defaulting and as the source of the TypeScript types used everywhere else.

## What the example app demonstrates

`projects/apps/app1` is a working reference app, and a genuinely good place to learn Switchboard by reading real code. It shows:

- addressable frames living alongside internal-only frames in the same graph
- named outlet companions declared per frame
- lazy frame loading
- payload transfer between frames through `history.state`
- direct-entry rejection and redirect for frames that shouldn't be entered cold
- frame-first navigation composed under a shell layout

A good place to start reading:

- `projects/apps/app1/src/app/app.routes.ts` — the whole navigation graph in one place
- `projects/apps/app1/src/app/frames` — each frame definition, one file at a time

## A note on scope

Switchboard still supports route-style concerns you already know — paths, redirects, params, and query parsing. The difference is philosophical: in Switchboard, these are projections and policies layered around your frame graph, not the primary source of truth for what your app *is*.

If you need broad Angular Router feature parity, Switchboard is intentionally narrower — and we think that's a feature, not a gap. Reach for it when you want:

- explicit frame identity
- transition-constrained navigation
- functional lifecycle hooks
- typed navigation and address generation
- shell composition, without having to adopt Angular Router's full route-tree model to get it

We're excited about where this model can take Angular navigation, and we'd love for you to come build with us.

## Server-owned graph delivery

Switchboard can divide the frame graph with `frameSlot()` and `framesFor()`. Protected-delivery builds authorize graph artifacts on the server, then resolve only the allowed contributions for SSR and browser navigation. Frame policies use `allowAnonymous`, `roles`, and `permissions`. See `docs/server-delivery.md`.

## Protected frame delivery

Switchboard can use a server-owned frame graph when frontend disclosure itself is part of the application architecture. The model is analogous to Waypoint's protected route delivery, but ownership follows frame-graph contributions:

```ts
export const routes = [
  frameSlot('public'),
  frameSlot('application'),
] as const satisfies NavigationTree;

export const applicationFrames = framesFor('application', [
  frame('workspace', WorkspacePage, {
    address: '/workspace',
  }),
  frameSlot('administration'),
]);
```

`@epikodelabs/switchboard-builder` derives artifact identity, AOT-compiles each `framesFor()` contribution into an isolated content-addressed artifact, verifies protected frame sources are absent from the public host, then atomically publishes server metadata. The browser receives only the frame contributions authorized by the server.

This ownership graph is deliberately separate from the transition graph: `frameSlot()/framesFor()` decide where code belongs and how it is delivered; `transitions` decide where navigation may move.

See `docs/build-model.md` and `docs/server-delivery-contract.md`.

## Server templates

Protected frame delivery is backend-neutral. The repository includes distributable
starter hosts for both Node + TypeScript and ASP.NET Core:

```text
templates/
  server-node-ts/
  server-aspnet-core/
```

The Node template is published as `@epikodelabs/switchboard-template-node-ts`; the
ASP.NET template is a NuGet `dotnet new` package named
`EpikodeLabs.Switchboard.Templates`. Both consume the same builder publication and
serve the same `/api/navigation/resolve` and `/api/navigation/modules/...` protocol.
