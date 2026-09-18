# Choosing a Navigation Library

The navigation ecosystem consists of three libraries built around the same philosophy, but three different navigation models.

The most important question is not:

> Which router has the features I need?

It is:

> How does my application naturally think about navigation?

All three libraries share familiar concepts:

* typed navigation
* layouts
* typed params and query schemas
* standalone-first Angular
* function-based lifecycle
* modern TypeScript

But they deliberately make different trade-offs.

---

# Waypoint

**Navigation by destination.**

Waypoint is the general-purpose choice for Angular applications.

Its primary model is the familiar relationship:

```text
URL → destination
```

A URL identifies where the application should be, and Waypoint resolves the route, layouts, lifecycle, data, and outlets needed to render that destination.

Choose Waypoint when URLs are the natural identity of your application screens.

Typical examples include:

* dashboards
* administration systems
* SaaS applications
* content applications
* portals
* e-commerce sites
* applications with substantial deep linking

Waypoint is particularly suitable when you need:

* deep linking
* browser history
* layouts
* lazy loading
* typed URLs
* named outlets
* route lifecycle
* SSR
* server-driven navigation
* server-authorized frontend delivery

Waypoint can model complex navigation, but its center of gravity remains the **destination**.

The fundamental question is:

> Which destination does this URL represent?

---

# Routty

**Navigation with the minimum machinery.**

Routty is the deliberately small member of the family.

Its model is still URL-based:

```text
URL → destination
```

but it avoids the infrastructure needed by the larger navigation systems.

Routty uses a small eager route model and keeps the API intentionally narrow.

Choose Routty when navigation is necessary but should not become an architectural subsystem.

Typical examples include:

* small applications
* internal tools
* prototypes
* demos
* libraries with embedded navigation
* applications with a small, known route catalog

Routty is a good fit when you value:

* minimal API surface
* eager routes
* straightforward route tables
* typed navigation
* layouts
* client and SSR execution
* low conceptual overhead

Routty is not a smaller Waypoint configuration.

It deliberately leaves out Waypoint-class infrastructure such as protected route artifact delivery and server-controlled route ownership.

The fundamental question is:

> What's the simplest way to reach this destination?

---

# Switchboard

**Navigation by contextual transition.**

Switchboard approaches navigation from a different direction.

URLs are not the runtime relationship model. Authored frames declare possible transitions, while the application the user can currently interact with is represented as a **materialized tree of frame and Angular view instances**.

A `Relay` is bound to one concrete visible frame. When that frame requests a target, Relay walks the actual materialized ownership chain until the nearest authored frame accepts the target. `FrameRuntime` then projects that accepted target to an address and delegates location navigation to `VanillaRouter`.

```text
visible frame
     ↓
    Relay
     ↓
bubble through visible owners
     ↓
nearest accepting authored frame
     ↓
target address / next materialized state
```

This makes navigation context part of the application model. Two instances of the same authored frame definition are distinct runtime nodes because navigation begins from the instance the user is actually in.

Choose Switchboard when a valid state transition from the current visible context matters more than simply matching a URL.

Typical examples include:

* onboarding
* checkout
* installers
* setup wizards
* editors
* approval workflows
* business processes
* kiosk applications
* embedded applications
* state-driven experiences

For example, a checkout application might naturally be:

```text
cart
  ↓ checkout
address
  ↓ continue
payment
  ↓ authorize
confirmation
```

The important information is not merely that `/payment` exists.

The application cares that `payment` is reached through a transition accepted by the currently materialized workflow context.

Switchboard can still participate in URL navigation, browser history, SSR, named outlets, and server-authorized frontend delivery. Those capabilities do not make it Waypoint. `VanillaRouter` remains the lower-level location engine; Switchboard's distinctive model is Relay operating on the visible frame tree.

The fundamental question is:

> From the frame the user is actually in, which visible owner can accept this transition?

---

# Waypoint or Switchboard?

This is the most important distinction.

Both are capable of supporting sophisticated Angular applications, SSR, and server-controlled frontend delivery.

Choose between them based on what represents the application most naturally.

### Waypoint

```text
URL
 ↓
route
 ↓
layouts
 ↓
destination
```

The destination is primary.

Use it when you mostly think:

> Go to `/projects/42/settings`.

### Switchboard

```text
visible frame
      ↓
    Relay
      ↓
visible ownership chain
      ↓
accepted transition
```

The transition from the current visible context is primary.

Use it when you mostly think:

> Move this workflow from `editing` to `review`.

A useful test is to imagine removing the URLs from your design.

If the application structure becomes difficult to describe, it is probably a **Waypoint** application.

If the application still makes sense as visible states, ownership, and allowed transitions, **Switchboard** may be the better model.

---

# Where Routty fits

Routty answers a different question.

Waypoint versus Switchboard is primarily a choice of **navigation model**.

Routty is primarily a choice of **complexity budget**.

```text
Need navigation?
      │
      ▼
Is a small eager URL router enough?
      │
   yes ───────→ Routty
      │
      no
      ▼
What naturally identifies navigation?
      │
      ├── destination / URL ─────→ Waypoint
      │
      └── visible state / transition ─→ Switchboard
```

This is why Routty should not gradually accumulate every Waypoint or Switchboard capability.

Its constraint is part of its purpose.

---

# Capability overview

| Capability                          |      Routty      | Waypoint | Switchboard |
| ----------------------------------- | :--------------: | :------: | :---------: |
| Typed navigation                    |         ✓        |     ✓    |      ✓      |
| Typed params/query                  |         ✓        |     ✓    |      ✓      |
| Layouts                             |         ✓        |     ✓    |      ✓      |
| Client navigation                   |         ✓        |     ✓    |      ✓      |
| SSR                                 |         ✓        |     ✓    |      ✓      |
| Lazy route model                    |         —        |     ✓    |      ✓      |
| Named/secondary composition         |       Basic      |     ✓    |      ✓      |
| Relay / frame transitions           |         —        |     —    |  **Native** |
| Materialized frame ownership        |         —        |     —    |  **Native** |
| Server-driven navigation            |         —        |     ✓    |      ✓      |
| Server-authorized frontend delivery |         —        |     ✓    |      ✓      |
| Protected artifact boundaries       |         —        |     ✓    |      ✓      |
| Minimal runtime/API                 | **Primary goal** |     —    |      —      |

The table should not be read as a ranking.

More checkmarks do not mean a better router.

Routty intentionally has fewer concepts. Waypoint and Switchboard intentionally solve larger architectural problems.

---

# Quick decision

| Your application is primarily...                                     | Choose          |
| -------------------------------------------------------------------- | --------------- |
| A small application with straightforward routes                      | **Routty**      |
| A conventional URL/deep-link driven application                      | **Waypoint**    |
| A workflow or state machine with contextual transitions              | **Switchboard** |
| A large SaaS/admin application                                       | **Waypoint**    |
| An onboarding or setup wizard                                        | **Switchboard** |
| A checkout with meaningful transition rules                          | **Switchboard** |
| A content or documentation application                               | **Waypoint**    |
| A small internal utility                                             | **Routty**      |
| An editor where modes form meaningful visible states                 | **Switchboard** |
| An application with protected frontend modules organized around URLs | **Waypoint**    |
| An application with protected workflow/frame definitions             | **Switchboard** |

---

# Don't choose by feature count

It can be tempting to think of the libraries as:

```text
Routty      → small
Waypoint    → medium
Switchboard → advanced
```

That is not the model.

A better picture is:

```text
                     navigation model

             destination         contextual transition
                 │                       │
                 │                       │
          ┌─────────────┐         ┌─────────────┐
          │  Waypoint   │         │ Switchboard │
          └─────────────┘         └─────────────┘
                 │                       │
                 └──── Waypoint-class ───┘
                       infrastructure


          ┌─────────────┐
          │   Routty    │
          └─────────────┘
                 │
          minimal URL routing
```

Waypoint and Switchboard are peers.

They provide similarly serious infrastructure around fundamentally different models.

Routty deliberately occupies the smaller design space.

---

# One philosophy, three models

The libraries share ideas because moving between them should feel familiar.

But they are not editions of one router.

**Routty** asks:

> What's the simplest way to reach this destination?

**Waypoint** asks:

> Which destination does this URL represent?

**Switchboard** asks:

> From the frame the user is actually in, which visible owner can accept this transition?

Choose the question that sounds most like your application.
