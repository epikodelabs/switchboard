# Switchboard server templates

Switchboard ships two starter server hosts for protected frame delivery:

- `server-node-ts` — Node.js + TypeScript + Express
- `server-aspnet-core` — ASP.NET Core minimal API

Both hosts consume the immutable `.switchboard/server/server-index.json` generation
published by `@epikodelabs/switchboard-builder`. They expose the same public protocol:

- `GET /api/navigation/resolve?path=...`
- `GET /api/navigation/modules/{artifactKey}/{hash}`

Unknown, stale, and unauthorized protected artifacts intentionally return `404`.
The browser never receives the complete protected frame catalog.

## Distribution

The Node template is an npm template package:

```bash
npm pack ./templates/server-node-ts
# publish as @epikodelabs/switchboard-template-node-ts
```

After publication it can be used with:

```bash
npx @epikodelabs/switchboard-template-node-ts ./server
```

The ASP.NET template is a NuGet template package:

```bash
dotnet pack templates/server-aspnet-core/pack/Switchboard.Templates.csproj -c Release
dotnet new install EpikodeLabs.Switchboard.Templates

dotnet new switchboard-server-aspnet -n MySwitchboardServer
```

The two implementations deliberately keep authentication extraction at the HTTP
adapter boundary. Replace the demo Bearer/cookie principal reader with the host
application's real identity system.
