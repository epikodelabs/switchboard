import type { Request, RequestHandler, Response } from 'express';
import fs from 'node:fs/promises';

import type { ServerPrincipal } from './models.js';
import type { SwitchboardServerRouter } from './router.js';

export interface ExpressDeliveryOptions {
  readonly router: SwitchboardServerRouter;
  readonly resolveArtifactPath: (relative: string) => string;
  readonly principal: (request: Request) => ServerPrincipal | undefined;
}

export function createResolveHandler(options: ExpressDeliveryOptions): RequestHandler {
  return async (request, response, next) => {
    try {
      noStore(response);
      const target = typeof request.query['path'] === 'string'
        ? request.query['path']
        : typeof request.query['target'] === 'string'
          ? request.query['target']
          : '';
      if (!target) {
        response.status(400).json({ error: 'Invalid path.' });
        return;
      }
      const resolution = await options.router.resolve(target, options.principal(request));
      if (!resolution) {
        response.status(404).json({ error: 'Frame not found.' });
        return;
      }
      response.json(resolution);
    } catch (error) {
      next(error);
    }
  };
}

export function createModuleHandler(options: ExpressDeliveryOptions): RequestHandler {
  return async (request, response, next) => {
    try {
      noStore(response);
      const artifactKey = request.params['artifactKey'] ?? '';
      const hash = request.params['hash'] ?? '';
      const authorized = await options.router.resolveModule(
        artifactKey,
        hash,
        options.principal(request),
      );
      if (!authorized) {
        response.sendStatus(404);
        return;
      }
      const absolute = options.resolveArtifactPath(authorized.artifact.file);
      try {
        await fs.access(absolute);
      } catch {
        response.sendStatus(404);
        return;
      }
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.type('text/javascript').sendFile(absolute);
    } catch (error) {
      next(error);
    }
  };
}

function noStore(response: Response): void {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Vary', 'Cookie, Authorization');
}
