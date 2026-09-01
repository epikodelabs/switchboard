namespace SwitchboardServer;

public sealed class SwitchboardRouter
{
    private readonly SwitchboardSnapshotSource _source;

    public SwitchboardRouter(SwitchboardSnapshotSource source) => _source = source;

    public async Task<ServerFrameResolution?> ResolveAsync(
        string target,
        ServerPrincipal? principal,
        CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(new Uri("http://switchboard.local"), target, out var uri))
            return null;

        var snapshot = await _source.LoadAsync(cancellationToken);
        var branch = Match(snapshot, uri.AbsolutePath);
        if (branch is null)
            return null;

        var artifact = snapshot.Index.Artifacts.FirstOrDefault(x => x.FrameSetId == branch.FrameSetId);
        if (artifact is null)
            return null;

        var chain = ResolveArtifactChain(snapshot, artifact.ArtifactKey);
        if (!IsChainAuthorized(snapshot, chain, principal))
            return null;

        return new ServerFrameResolution(
            artifact.ArtifactKey,
            chain.Select(item => new ServerFrameArtifactDelivery(
                item.ArtifactKey,
                $"/api/navigation/modules/{Uri.EscapeDataString(item.ArtifactKey)}/{Uri.EscapeDataString(item.Hash)}",
                item.Hash,
                item.SlotId)).ToArray());
    }

    public async Task<ServerFrameArtifact?> ResolveModuleAsync(
        string artifactKey,
        string hash,
        ServerPrincipal? principal,
        CancellationToken cancellationToken)
    {
        var snapshot = await _source.LoadAsync(cancellationToken);
        var artifact = snapshot.Index.Artifacts.FirstOrDefault(x =>
            x.ArtifactKey == artifactKey && x.Hash == hash);
        if (artifact is null)
            return null;

        var chain = ResolveArtifactChain(snapshot, artifact.ArtifactKey);
        return IsChainAuthorized(snapshot, chain, principal) ? artifact : null;
    }

    public string ResolveArtifactPath(string relative) => _source.ResolveArtifactPath(relative);

    private static ServerFrameBranch? Match(ServerFrameSnapshot snapshot, string pathname)
    {
        var prefixes = snapshot.Index.Shards
            .Where(shard => PrefixMatches(pathname, shard.Prefix))
            .OrderByDescending(shard => shard.Prefix.Length)
            .ToArray();
        if (prefixes.Length == 0)
            return null;

        return snapshot.Branches.Values.FirstOrDefault(branch =>
            branch.Path is not null
            && PrefixMatches(pathname, branch.StaticPrefix)
            && MatchPattern(branch.Path, pathname));
    }

    private static IReadOnlyList<ServerFrameArtifact> ResolveArtifactChain(
        ServerFrameSnapshot snapshot,
        string artifactKey)
    {
        var byKey = snapshot.Index.Artifacts.ToDictionary(x => x.ArtifactKey, StringComparer.Ordinal);
        var output = new List<ServerFrameArtifact>();
        var visiting = new HashSet<string>(StringComparer.Ordinal);
        var visited = new HashSet<string>(StringComparer.Ordinal);

        void Visit(string key)
        {
            if (visited.Contains(key)) return;
            if (!visiting.Add(key))
                throw new InvalidOperationException($"Recursive artifact dependency: {key}");
            if (!byKey.TryGetValue(key, out var artifact))
                throw new InvalidOperationException($"Missing artifact dependency: {key}");
            foreach (var dependency in artifact.Dependencies)
                Visit(dependency);
            visiting.Remove(key);
            visited.Add(key);
            output.Add(artifact);
        }

        Visit(artifactKey);
        return output;
    }

    private static bool IsChainAuthorized(
        ServerFrameSnapshot snapshot,
        IReadOnlyList<ServerFrameArtifact> chain,
        ServerPrincipal? principal) =>
        chain.All(artifact => artifact.BranchIds.Count > 0
            && artifact.BranchIds.All(id => snapshot.Branches.TryGetValue(id, out var branch)
                && branch.FrameSetId == artifact.FrameSetId
                && branch.Policies.All(policy => IsPolicyAllowed(policy, principal))));

    private static bool IsPolicyAllowed(ServerFramePolicy policy, ServerPrincipal? principal)
    {
        if (policy.AllowAnonymous == true) return true;
        if (principal is null) return false;
        var roles = policy.Roles ?? Array.Empty<string>();
        return (roles.Count == 0 || roles.Any(principal.Roles.Contains))
            && (policy.Permissions ?? Array.Empty<string>()).All(principal.Permissions.Contains);
    }

    private static bool PrefixMatches(string path, string prefix) =>
        prefix == "/" || path == prefix || path.StartsWith(prefix + "/", StringComparison.Ordinal);

    private static bool MatchPattern(string pattern, string path)
    {
        var expected = Segments(pattern);
        var actual = Segments(path);
        if (expected.Length != actual.Length) return false;
        for (var i = 0; i < expected.Length; i++)
            if (!expected[i].StartsWith(':') && expected[i] != actual[i]) return false;
        return true;
    }

    private static string[] Segments(string value) =>
        value.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
}
