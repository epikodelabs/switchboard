import { Relay, type RelayRuntime, type RelayTarget } from '../lib/frame-relay';
import { FrameTree } from '../lib/frame-tree';

describe('Relay', () => {
  it('is an origin-bound capability and delegates tree navigation to the runtime', async () => {
    const tree = new FrameTree();
    const origin = tree.create('books', document.createElement('frame-host'));
    const target: RelayTarget = { kind: 'frame', id: 'journal' };
    const calls: string[] = [];
    const runtime: RelayRuntime = {
      resolve(node, requested) { calls.push(`resolve:${node.key}:${requested.id}`); return null; },
      async send(node, requested) { calls.push(`send:${node.key}:${requested.id}`); return true; },
      link(node, requested) { calls.push(`link:${node.key}:${requested.id}`); return '/journal'; },
    };
    const relay = new Relay(origin, runtime);

    expect(relay.resolve(target)).toBeNull();
    expect(await relay.to(target)).toBeTrue();
    expect(relay.href(target)).toBe('/journal');
    expect(calls).toEqual([
      `resolve:${origin.key}:journal`,
      `send:${origin.key}:journal`,
      `link:${origin.key}:journal`,
    ]);
  });
});
