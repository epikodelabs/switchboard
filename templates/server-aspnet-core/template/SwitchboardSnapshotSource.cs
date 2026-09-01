using System.Text.Json;

namespace SwitchboardServer;

public sealed class SwitchboardSnapshotSource
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly string _outputRoot;
    private readonly string _indexPath;
    private readonly string _protectedRoot;
    private ServerFrameSnapshot? _current;

    public SwitchboardSnapshotSource(IConfiguration configuration)
    {
        _outputRoot = Path.GetFullPath(
            configuration["Switchboard:OutputRoot"]
            ?? Environment.GetEnvironmentVariable("SWITCHBOARD_OUTPUT_ROOT")
            ?? "dist/app/.switchboard/server");
        _indexPath = Path.Combine(_outputRoot, "server-index.json");
        _protectedRoot = Path.GetFullPath(
            configuration["Switchboard:ProtectedRoot"]
            ?? Environment.GetEnvironmentVariable("SWITCHBOARD_PROTECTED_ROOT")
            ?? "dist/app/protected");
    }

    public async Task<ServerFrameSnapshot> LoadAsync(CancellationToken cancellationToken)
    {
        var revision = Revision();
        if (_current is { } current && current.Revision == revision)
            return current;

        await _gate.WaitAsync(cancellationToken);
        try
        {
            revision = Revision();
            if (_current is { } locked && locked.Revision == revision)
                return locked;

            var index = await ReadJsonAsync<ServerFrameIndex>(_indexPath, cancellationToken);
            var branches = new Dictionary<string, ServerFrameBranch>(StringComparer.Ordinal);
            foreach (var file in index.Shards.Select(x => x.File).Distinct(StringComparer.Ordinal))
            {
                var shard = await ReadJsonAsync<ServerFrameShard>(ResolveOutputPath(file), cancellationToken);
                foreach (var branch in shard.Frames)
                    branches[branch.Id] = branch;
            }

            var snapshot = new ServerFrameSnapshot(index, branches, revision);
            _current = snapshot;
            return snapshot;
        }
        finally
        {
            _gate.Release();
        }
    }

    public string ResolveOutputPath(string relative)
    {
        var root = Path.GetFullPath(_outputRoot);
        var absolute = Path.GetFullPath(Path.Combine(root, relative));
        var relation = Path.GetRelativePath(root, absolute);
        if (relation == ".." || relation.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) || Path.IsPathRooted(relation))
            throw new InvalidOperationException($"Compiler output path \"{relative}\" escapes \"{root}\".");
        return absolute;
    }

    public string ResolveArtifactPath(string relative)
    {
        var absolute = Path.GetFullPath(Path.Combine(_outputRoot, relative));
        var relation = Path.GetRelativePath(_protectedRoot, absolute);
        if (relation == ".." || relation.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal) || Path.IsPathRooted(relation))
            throw new InvalidOperationException($"Protected artifact path \"{relative}\" escapes \"{_protectedRoot}\".");
        return absolute;
    }

    private string Revision()
    {
        var info = new FileInfo(_indexPath);
        return $"{info.LastWriteTimeUtc.Ticks}:{info.Length}";
    }

    private static async Task<T> ReadJsonAsync<T>(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return (await JsonSerializer.DeserializeAsync<T>(stream, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }, cancellationToken)) ?? throw new InvalidOperationException($"Invalid JSON: {path}");
    }
}
