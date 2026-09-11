import { resolveRelayPath, type RelayFrameRecord } from '../lib/frame-relay';

function graph(...records: RelayFrameRecord[]): ReadonlyMap<string, RelayFrameRecord> {
  return new Map(records.map(record => [record.frameId, record]));
}

describe('peer-to-peer frame Relay', () => {
  it('uses a direct peer connection without bubbling', () => {
    const frames = graph(
      { frameId: 'workspace', parentFrameIds: [], transitions: [] },
      { frameId: 'books', parentFrameIds: ['workspace'], transitions: ['journal'] },
      { frameId: 'journal', parentFrameIds: ['workspace'], transitions: [] },
    );

    expect(resolveRelayPath(frames, 'books', 'journal')).toEqual({
      originFrameId: 'books',
      bubble: ['books'],
      acceptedByFrameId: 'books',
      cascade: ['journal'],
      targetFrameId: 'journal',
    });
  });

  it('bubbles until an ancestor accepts the connection', () => {
    const frames = graph(
      { frameId: 'app', parentFrameIds: [], transitions: ['settings'] },
      { frameId: 'workspace', parentFrameIds: ['app'], transitions: [] },
      { frameId: 'document', parentFrameIds: ['workspace', 'app'], transitions: [] },
      { frameId: 'settings', parentFrameIds: ['app'], transitions: [] },
    );

    expect(resolveRelayPath(frames, 'document', 'settings')).toEqual({
      originFrameId: 'document',
      bubble: ['document', 'workspace', 'app'],
      acceptedByFrameId: 'app',
      cascade: ['settings'],
      targetFrameId: 'settings',
    });
  });

  it('stops at the nearest ancestor that accepts the connection', () => {
    const frames = graph(
      { frameId: 'app', parentFrameIds: [], transitions: ['settings'] },
      { frameId: 'workspace', parentFrameIds: ['app'], transitions: ['settings'] },
      { frameId: 'document', parentFrameIds: ['workspace', 'app'], transitions: [] },
      { frameId: 'settings', parentFrameIds: ['app'], transitions: [] },
    );

    expect(resolveRelayPath(frames, 'document', 'settings')?.acceptedByFrameId)
      .toBe('workspace');
    expect(resolveRelayPath(frames, 'document', 'settings')?.bubble)
      .toEqual(['document', 'workspace']);
  });

  it('rejects a relay when no peer in the bubble chain accepts it', () => {
    const frames = graph(
      { frameId: 'app', parentFrameIds: [], transitions: [] },
      { frameId: 'document', parentFrameIds: ['app'], transitions: [] },
      { frameId: 'admin', parentFrameIds: ['app'], transitions: [] },
    );

    expect(resolveRelayPath(frames, 'document', 'admin')).toBeNull();
  });
});
