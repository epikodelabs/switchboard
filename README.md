# Switchboard

Switchboard is a frame-first navigation library for Angular.

This workspace contains:

- the library source in `projects/libraries/switchboard`
- the current showcase app in `projects/apps/app1`

## Library

Build the library:

```bash
npm run build
```

Run the library test suite:

```bash
npm test
```

## Showcase App

`app1` is the current reference app. It demonstrates the frame-first model used by the library:

- one frame per file
- addressable frames declared with `address(...)`
- internal-only frames that still participate in the frame graph
- transitions declared between frames
- direct-entry control and redirect-on-invalid-entry behavior
- typed params and query schemas
- outlet companions declared on the frame itself
- payload handoff through navigation state instead of the address bar
- lazy frame loading and `prepare` hooks

Run the app:

```bash
npm run start:playground
```

Build the app:

```bash
npm run build:playground
```

Useful places to inspect:

- `projects/apps/app1/src/app/app.routes.ts`
- `projects/apps/app1/src/app/frames`
- `projects/libraries/switchboard/src/lib`
