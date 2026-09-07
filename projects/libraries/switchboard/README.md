# @epikodelabs/switchboard

Frame-first navigation primitives for standalone Angular applications.

Switchboard models an application as named frames. A frame owns lifecycle hooks, named companion outlets, transition rules, and an optional server-delivery policy. A route places the frame at a public URL and declares typed parameters and query values. This keeps the navigation contract close to the feature it describes instead of spreading it among a URL table, guards, and component wiring.

```bash
npm install @epikodelabs/switchboard
```

Peer dependencies: `@angular/core` and `@angular/common` `>=16.0.0`.

## Minimal example

```ts
import { frame, provideRouter, route, s } from '@epikodelabs/switchboard';

const profile = frame('profile', ProfilePage, {
  directEntry: true,
  prepare: async context => ({
    profile: await profileApi.get(Number(context.params['id'])),
  }),
});

export const routes = [
  route('/profiles/:id', profile, {
    params: { id: s.number({ min: 1 }) },
    query: { tab: s.string('overview') },
  }),
] as const;

export const providers = [...provideRouter(routes)];
```

Use `RouterOutlet` to host the primary or named frame outlet. Inject `Router` for `navigate`, `href`, `navigateTo`, and `hrefTo`, or use the `RouterLink` directive in templates.

## API at a glance

| API | Role |
| --- | --- |
| `frame()` | Define a named application frame. |
| `route()` | Place a frame or view at a URL. |
| `layout()` | Compose shell UI around a branch. |
| `redirect()` | Redirect URL paths or navigation targets. |
| `s` | Runtime schemas and inferred types for URL values. |
| `frameSlot()` / `framesFor()` | Declare server-delivery ownership boundaries. |
| `provideRouter()` / `provideServerRouter()` | Install the router and, optionally, a generated resolver. |

## Frames and routes

The `routes` array is the only authored navigation tree. A frame owns its
identity, transitions, outlets, and lifecycle hooks. `route()` gives that frame
a URL and owns path-specific params and query schemas. When a frame is passed
to `route()`, its id becomes the route name for typed navigation.

```ts
const account = frame('account', AccountPage, {
  transitions: ['books'],
});

export const routes = [
  layout('/app', AppShellComponent, [
    route('/accounts/:id', account, {
      params: { id: s.number({ min: 1 }) },
    }),
  ]),
] as const;
```

Server delivery is opt-in. The companion builder turns `framesFor()` contributions into protected artifacts, and the host server authorizes their delivery. See the repository [README](../../../README.md) for the model, templates, and full documentation links.
