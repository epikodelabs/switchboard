import type {
  ServerFrameIndex,
  ServerFrameShard,
  ServerFrameSnapshot,
} from './models.js';

export interface SnapshotSourceOptions {
  loadIndex(): Promise<ServerFrameIndex>;
  loadShard(file: string): Promise<ServerFrameShard>;
  revision?(): Promise<string | number>;
}

export interface SnapshotSource {
  loadSnapshot(): Promise<ServerFrameSnapshot>;
  refresh(): Promise<ServerFrameSnapshot>;
  invalidate(): void;
}

export function createSnapshotSource(options: SnapshotSourceOptions): SnapshotSource {
  let current: ServerFrameSnapshot | undefined;
  let currentRevision: string | number | undefined;
  let pending: Promise<ServerFrameSnapshot> | undefined;
  let epoch = 0;

  async function build(): Promise<{ snapshot: ServerFrameSnapshot; revision?: string | number }> {
    const revision = options.revision ? await options.revision() : undefined;
    const index = await options.loadIndex();
    const shardFiles = [...new Set(index.shards.map(shard => shard.file))];
    const shards = await Promise.all(shardFiles.map(file => options.loadShard(file)));
    const branches = new Map<string, ServerFrameShard['frames'][number]>();
    for (const shard of shards) {
      for (const branch of shard.frames) branches.set(branch.id, branch);
    }
    return {
      snapshot: Object.freeze({ index, branches }),
      revision,
    };
  }

  function publish(): Promise<ServerFrameSnapshot> {
    if (pending) return pending;
    const publicationEpoch = epoch;
    const attempt = build().then(result => {
      if (epoch === publicationEpoch) {
        current = result.snapshot;
        currentRevision = result.revision;
      }
      return result.snapshot;
    });
    pending = attempt;
    const clear = () => { if (pending === attempt) pending = undefined; };
    attempt.then(clear, clear);
    return attempt;
  }

  return Object.freeze({
    async loadSnapshot() {
      if (!current) return publish();
      if (!options.revision) return current;
      const revision = await options.revision();
      return revision === currentRevision ? current : publish();
    },
    refresh: publish,
    invalidate() {
      epoch++;
      current = undefined;
      currentRevision = undefined;
      pending = undefined;
    },
  });
}
