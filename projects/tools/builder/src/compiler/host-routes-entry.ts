export function createHostRoutesSource(slotIds: readonly string[]): string {
  return [
    `// Switchboard generated public frame-graph host.`,
    `import { frameSlot } from '@epikodelabs/switchboard';`,
    ``,
    `export const routes = [`,
    ...slotIds.map(id => `  frameSlot(${JSON.stringify(id)}),`),
    `];`,
    ``,
  ].join('\n');
}

export function rootFrameSlotIds(entries: readonly any[]): readonly string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.kind !== 'frame-slot') {
      throw new Error(
        'Switchboard protected-delivery entry must contain only root frameSlot() declarations. ' +
        'Move public and protected frames into framesFor() contributions so the host cannot import protected implementation.',
      );
    }
    const id = String(entry.slotId ?? '').trim();
    if (!id) throw new Error('Switchboard root frame slot id must not be empty.');
    if (!ids.includes(id)) ids.push(id);
  }
  return Object.freeze(ids);
}
