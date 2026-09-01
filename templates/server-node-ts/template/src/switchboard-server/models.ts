export interface ServerPrincipal {
  readonly subject: string;
  readonly roles: ReadonlySet<string>;
  readonly permissions: ReadonlySet<string>;
}

export interface ServerFramePolicy {
  readonly allowAnonymous?: boolean;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
}

export interface ServerFrameBranch {
  readonly id: string;
  readonly frameId?: string;
  readonly path?: string;
  readonly staticPrefix: string;
  readonly policies: readonly ServerFramePolicy[];
  readonly frameSetId: string;
}

export interface ServerFrameArtifact {
  readonly kind: 'frame';
  readonly artifactKey: string;
  readonly frameSetId: string;
  readonly slotId: string;
  readonly frameIds: readonly string[];
  readonly dependencies: readonly string[];
  readonly branchIds: readonly string[];
  readonly file: string;
  readonly hash: string;
  readonly bytes?: number;
}

export interface ServerFrameIndex {
  readonly version: 1;
  readonly generatedAt: string;
  readonly generationHash?: string;
  readonly shards: readonly {
    readonly prefix: string;
    readonly file: string;
  }[];
  readonly artifacts: readonly ServerFrameArtifact[];
}

export interface ServerFrameShard {
  readonly version: 1;
  readonly frames: readonly ServerFrameBranch[];
}

export interface ServerFrameSnapshot {
  readonly index: ServerFrameIndex;
  readonly branches: ReadonlyMap<string, ServerFrameBranch>;
}

export interface ServerFrameArtifactDelivery {
  readonly artifactKey: string;
  readonly moduleUrl: string;
  readonly hash: string;
  readonly slotId: string;
}

export interface ServerFrameResolution {
  readonly artifactKey: string;
  readonly artifacts: readonly ServerFrameArtifactDelivery[];
}
