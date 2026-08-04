import { parseParams, parseQuery, s } from '../lib/query-schema';

describe('Switchboard strict route schemas', () => {
  it('rejects numbers outside their declared range', () => {
    expect(() => parseParams({ id: s.number({ min: 1 }) }, { id: '0' }))
      .toThrowError(/below the minimum/);
  });

  it('rejects invalid booleans', () => {
    expect(() => parseQuery({ enabled: s.boolean() }, new URL('https://example.test/?enabled=banana')))
      .toThrowError(/Invalid boolean/);
  });
});