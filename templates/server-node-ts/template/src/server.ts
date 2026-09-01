import express from 'express';
import path from 'node:path';

import { compilerOutputSource, resolveProtectedArtifactPath } from './compiler-output.js';
import { readPrincipal } from './principal.js';
import {
  createModuleHandler,
  createResolveHandler,
  createSwitchboardServerRouter,
} from './switchboard-server/public-api.js';

const app = express();
const protectedRoot = path.resolve(
  process.env['SWITCHBOARD_PROTECTED_ROOT'] ?? 'dist/app/protected',
);
const browserRoot = path.resolve(
  process.env['SWITCHBOARD_BROWSER_ROOT'] ?? 'dist/app/browser',
);

const router = createSwitchboardServerRouter({ source: compilerOutputSource });
const delivery = {
  router,
  principal: readPrincipal,
  resolveArtifactPath: (relative: string) => resolveProtectedArtifactPath(relative, protectedRoot),
} as const;

app.get('/api/navigation/resolve', createResolveHandler(delivery));
app.get('/api/navigation/modules/:artifactKey/:hash', createModuleHandler(delivery));
app.get('/api/ping', (_request, response) => {
  response.json({ ok: true, runtime: 'node-ts', renderedAt: new Date().toISOString() });
});

app.use(express.static(browserRoot));
app.get('*path', (_request, response) => response.sendFile(path.join(browserRoot, 'index.html')));

const port = Number(process.env['PORT'] ?? 4000);
app.listen(port, () => console.log(`Switchboard server listening on http://localhost:${port}`));
