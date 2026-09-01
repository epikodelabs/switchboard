import type { Request } from 'express';
import type { ServerPrincipal } from './switchboard-server/public-api.js';

const profiles: Readonly<Record<string, ServerPrincipal>> = Object.freeze({
  user: Object.freeze({
    subject: 'user',
    roles: new Set(['user']),
    permissions: new Set(['workspace:read']),
  }),
  admin: Object.freeze({
    subject: 'admin',
    roles: new Set(['admin']),
    permissions: new Set(['workspace:read', 'admin:read']),
  }),
});

export function readPrincipal(request: Request): ServerPrincipal | undefined {
  const authorization = request.header('authorization') ?? '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const cookie = request.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith('identity='))
    ?.slice('identity='.length);
  const identity = bearer || cookie;
  return identity ? profiles[decodeURIComponent(identity)] : undefined;
}
