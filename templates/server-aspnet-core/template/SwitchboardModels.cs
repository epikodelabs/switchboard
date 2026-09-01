namespace SwitchboardServer;

public sealed record ServerPrincipal(
    string Subject,
    IReadOnlySet<string> Roles,
    IReadOnlySet<string> Permissions);

public sealed record ServerFramePolicy(
    bool? AllowAnonymous = null,
    IReadOnlyList<string>? Roles = null,
    IReadOnlyList<string>? Permissions = null);

public sealed record ServerFrameBranch(
    string Id,
    string? FrameId,
    string? Path,
    string StaticPrefix,
    IReadOnlyList<ServerFramePolicy> Policies,
    string FrameSetId);

public sealed record ServerFrameArtifact(
    string Kind,
    string ArtifactKey,
    string FrameSetId,
    string SlotId,
    IReadOnlyList<string> FrameIds,
    IReadOnlyList<string> Dependencies,
    IReadOnlyList<string> BranchIds,
    string File,
    string Hash,
    long? Bytes = null);

public sealed record ServerFrameShardDescriptor(string Prefix, string File);

public sealed record ServerFrameIndex(
    int Version,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<ServerFrameShardDescriptor> Shards,
    IReadOnlyList<ServerFrameArtifact> Artifacts,
    string? GenerationHash = null);

public sealed record ServerFrameShard(
    int Version,
    IReadOnlyList<ServerFrameBranch> Frames);

public sealed record ServerFrameSnapshot(
    ServerFrameIndex Index,
    IReadOnlyDictionary<string, ServerFrameBranch> Branches,
    string Revision);

public sealed record ServerFrameArtifactDelivery(
    string ArtifactKey,
    string ModuleUrl,
    string Hash,
    string SlotId);

public sealed record ServerFrameResolution(
    string ArtifactKey,
    IReadOnlyList<ServerFrameArtifactDelivery> Artifacts);
