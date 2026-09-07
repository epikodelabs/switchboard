import {
  frame,
  frameSlot,
  framesFor,
  layout,
  resolveFrameSlots,
  route,
} from '../lib';

class Shell {}
class Home {}
class Admin {}

function ids(entries: readonly any[]): string[] {
  const result: string[] = [];
  const visit = (items: readonly any[]) => {
    for (const entry of items) {
      if (entry.kind === 'layout') visit(entry.entries);
      if (entry.kind === 'route' && entry.frame?.id) result.push(entry.frame.id);
    }
  };
  visit(entries);
  return result;
}

describe('frame graph ownership', () => {
  it('resolves authorized contributions through nested frame slots', () => {
    const root = [
      layout('/app', Shell, [
        route('/home', frame('home', Home, { transitions: ['admin'] })),
        frameSlot('administration'),
      ]),
    ] as const;

    const admin = framesFor('administration', [
      route('/admin', frame('admin', Admin, {
        policy: { roles: ['admin'] },
      })),
    ] as const);

    expect(ids(resolveFrameSlots(root, [admin]))).toEqual(['home', 'admin']);
    expect(ids(resolveFrameSlots(root, []))).toEqual(['home']);
  });
});
