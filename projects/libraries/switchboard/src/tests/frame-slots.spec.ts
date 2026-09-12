import {
  frame,
  frameSlot,
  framesFor,
  resolveFrameSlots,
} from '../lib';

class Shell {}
class Home {}
class Admin {}

function ids(frames: readonly any[]): string[] {
  const result: string[] = [];
  const visit = (items: readonly any[]) => {
    for (const entry of items) {
      if (entry.kind === 'layout') visit(entry.layout);
      if (entry.kind === 'frame' && entry.layout) visit(entry.layout);
      if (entry.kind === 'frame' && !entry.layout && entry.id) result.push(entry.id);
    }
  };
  visit(frames);
  return result;
}

describe('frame graph ownership', () => {
  it('resolves authorized contributions through nested frame slots', () => {
    const root = [
      frame('app', '/app', Shell, {
        layout: [
          frame('home', '/home', Home, { transitions: ['admin'] }),
          frameSlot('administration'),
        ],
      }),
    ] as const;

    const admin = framesFor('administration', [
      frame('admin', '/admin', Admin, {
        policy: { roles: ['admin'] },
      }),
    ] as const);

    expect(ids(resolveFrameSlots(root, [admin]))).toEqual(['home', 'admin']);
    expect(ids(resolveFrameSlots(root, []))).toEqual(['home']);
  });
});
