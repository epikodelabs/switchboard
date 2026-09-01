namespace SwitchboardServer;

public sealed class DemoPrincipalStore
{
    private readonly IReadOnlyDictionary<string, ServerPrincipal> _profiles =
        new Dictionary<string, ServerPrincipal>(StringComparer.Ordinal)
        {
            ["user"] = new(
                "user",
                new HashSet<string>(["user"], StringComparer.Ordinal),
                new HashSet<string>(["workspace:read"], StringComparer.Ordinal)),
            ["admin"] = new(
                "admin",
                new HashSet<string>(["admin"], StringComparer.Ordinal),
                new HashSet<string>(["workspace:read", "admin:read"], StringComparer.Ordinal))
        };

    public ServerPrincipal? Read(HttpRequest request)
    {
        string? identity = null;
        var authorization = request.Headers.Authorization.ToString();
        if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            identity = authorization["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(identity))
            request.Cookies.TryGetValue("identity", out identity);
        return identity is not null && _profiles.TryGetValue(identity, out var principal)
            ? principal
            : null;
    }
}
