import {
  frame,
  frameSlot,
  framesFor,
  resolveFrameSlots,
} from '../lib';

class Shell {}
class Home {}
class Admin {}

function ids(children: readonly any[]): string[] {
  const result: string[] = [];
  const visit = (items: readonly any[]) => {
    for (const entry of items) {
      if (entry.kind === 'layout') visit(entry.children);
      if (entry.kind === 'frame' && entry.children) visit(entry.children);
      if (entry.kind === 'frame' && !entry.children && entry.id) result.push(entry.id);
    }
  };
  visit(children);
  return result;
}

describe('frame graph ownership', () => {
  it('resolves authorized contributions through nested frame slots', () => {
    const root = [
      frame('app', '/app', Shell, {
        children: [
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
