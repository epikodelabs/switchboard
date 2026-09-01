# Switchboard Node + TypeScript server template

This package creates a small Express host for Switchboard's server-authorized frame
delivery protocol. It consumes one atomic compiler publication, performs URL matching
and authorization on the server, resolves dependency-first artifact chains, and serves
only authorized protected JavaScript modules.

```bash
npx @epikodelabs/switchboard-template-node-ts ./server
cd server
npm install
npm run dev
```

Set `SWITCHBOARD_OUTPUT_ROOT` to the builder's `.switchboard/server` directory and
`SWITCHBOARD_PROTECTED_ROOT` to the build's protected artifact directory when they are
not beside the server process.

The template's principal reader accepts a Bearer token or `identity` cookie only as a
small working example. Replace it with your authentication/session integration.
