# @epikodelabs/switchboard

Frame-first navigation primitives for standalone Angular applications.

Switchboard models an application as named frames. A frame may have a public URL, typed parameters and query values, lifecycle hooks, named companion outlets, transition rules, and an optional server-delivery policy. This keeps the navigation contract close to the feature it describes instead of spreading it among a URL table, guards, and component wiring.

```bash
npm install @epikodelabs/switchboard
```

Peer dependencies: `@angular/core` and `@angular/common` `>=16.0.0`.

## Minimal example

```ts
import { frame, navigation, provideRouter, s } from '@epikodelabs/switchboard';

const profile = frame('profile', ProfilePage, {
  address: '/profiles/:id',
  directEntry: true,
  params: { id: s.number({ min: 1 }) },
  query: { tab: s.string('overview') },
  prepare: async context => ({
    profile: await profileApi.get(Number(context.params['id'])),
  }),
});

export const routes = navigation({
  frames: [profile] as const,
  entries: [profile] as const,
});

export const providers = [...provideRouter(routes)];
```

Use `RouterOutlet` to host the primary or named frame outlet. Inject `Router` for `navigate`, `href`, `navigateTo`, and `hrefTo`, or use the `RouterLink` directive in templates.

## API at a glance

| API | Role |
| --- | --- |
| `frame()` with `view()` / `lazyView()` | Define eager or lazy application frames. |
| `layout()` / `lazyLayout()` | Compose shell UI around a branch. |
| `navigation()` | Declare a frame catalog and entries. |
| `redirect()` | Redirect URL paths or navigation targets. |
| `s` | Runtime schemas and inferred types for URL values. |
| `frameSlot()` / `framesFor()` | Declare server-delivery ownership boundaries. |
| `provideRouter()` / `provideServerRouter()` | Install the router and, optionally, a generated resolver. |

Server delivery is opt-in. The companion builder turns `framesFor()` contributions into protected artifacts, and the host server authorizes their delivery. See the repository [README](../../../README.md) for the model, templates, and full documentation links.
