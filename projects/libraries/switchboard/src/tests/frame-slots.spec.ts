import {
  allowsFrameArtifact,
  frame,
  frameSlot,
  framesFor,
  layout,
  resolveDeliveredFrames,
  resolveFrameSlots,
  type FrameArtifactDescriptor,
} from '../lib';

class Shell {}
class Home {}
class Admin {}

function ids(entries: readonly any[]): string[] {
  const result: string[] = [];
  const visit = (items: readonly any[]) => {
    for (const entry of items) {
      if (entry.kind === 'layout') visit(entry.entries);
      if (entry.kind === 'defined-frame') result.push(entry.id);
    }
  };
  visit(entries);
  return result;
}

describe('frame graph ownership', () => {
  it('resolves authorized contributions through nested frame slots', () => {
    const root = [
      layout('/app', Shell, [
        frame('home', Home, { address: '/home', transitions: ['admin'] }),
        frameSlot('administration'),
      ]),
    ] as const;

    const admin = framesFor('administration', [
      frame('admin', Admin, {
        address: '/admin',
        policy: { roles: ['admin'] },
      }),
    ] as const);

    expect(ids(resolveFrameSlots(root, [admin]))).toEqual(['home', 'admin']);
    expect(ids(resolveFrameSlots(root, []))).toEqual(['home']);
  });

  it('authorizes artifact disclosure independently from navigation guards', () => {
    expect(allowsFrameArtifact(
      { roles: ['admin'], permissions: ['audit:read'] },
      { authenticated: true, roles: ['admin'], permissions: ['audit:read'] },
    )).toBeTrue();

    expect(allowsFrameArtifact(
      { roles: ['admin'] },
      { authenticated: true, roles: ['user'] },
    )).toBeFalse();
  });

  it('binds compiler-owned artifact identity during delivery', async () => {
    const root = [frameSlot('administration')] as const;
    const descriptor: FrameArtifactDescriptor = {
      artifactKey: 'src/app/frames/admin#administrationFrames',
      slotId: 'administration',
    };

    const resolved = await resolveDeliveredFrames(
      root,
      [descriptor],
      async () => framesFor('administration', [
        frame('admin', Admin, { address: '/admin' }),
      ]),
    );

    expect(ids(resolved)).toEqual(['admin']);
  });
});
