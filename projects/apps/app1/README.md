# Switchboard app1

`app1` is the reference demo for Switchboard's visible-tree Relay navigation.

It models a general-ledger workspace. The `ledger` frame owns the application shell and materializes both a default content branch and a named `sidebar` companion outlet.

```text
ledger
├── [sidebar] companion frame
└── [default] books / account / journal / trial / settings
```

The authored root is in `src/app/app.frames.ts`:

```ts
frame('ledger', '/ledger', LedgerShellPage, {
  transitions: ['books', 'account', 'journal', 'entry', 'trial', 'settings'],
  layout: [
    redirect('', booksFrame),
    booksFrame,
    accountFrame,
    journalFrame,
    entryFrame,
    trialFrame,
    settingsFrame,
  ],
})
```

The shell uses ordinary `FrameOutlet` instances:

```html
<frame-outlet name="sidebar" />
<frame-outlet />
```

Those outlets are logically owned by the materialized `ledger` frame. They are sibling branches of the same visible frame tree.

Pages can initiate navigation through an injected `Relay`. Relay begins at that concrete visible frame instance and bubbles toward its materialized parents until a frame accepts the target. This is the behavior the demo is intended to showcase: navigation is initiated locally but resolved through the visible composition rather than through a global frame navigator.

The application is configured with:

```ts
...provideFrameGraph(frames, { viewTransitions: true })
```

See `libraries/switchboard/README.md` for the complete architectural model.
