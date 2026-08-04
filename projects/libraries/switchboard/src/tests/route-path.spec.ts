import {
  compileRoutePath,
  joinRoutePath,
  matchRoutePath,
} from '../lib/route-path';

describe('Switchboard route paths', () => {
  it('joins layout and route paths', () => {
    expect(joinRoutePath('/workspace/:workspaceId', '/items/:itemId'))
      .toBe('/workspace/:workspaceId/items/:itemId');
  });

  it('matches and decodes parameters', () => {
    const pattern = compileRoutePath('/items/:itemId');
    expect(matchRoutePath(pattern, '/items/a%20b')).toEqual({ itemId: 'a b' });
  });

  it('rejects malformed parameter names', () => {
    expect(() => compileRoutePath('/items/:item-id')).toThrowError(/Invalid path parameter/);
  });
});