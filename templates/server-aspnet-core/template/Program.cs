using SwitchboardServer;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<SwitchboardSnapshotSource>();
builder.Services.AddSingleton<SwitchboardRouter>();
builder.Services.AddSingleton<DemoPrincipalStore>();

var app = builder.Build();
var configuration = app.Configuration;
var browserRoot = Path.GetFullPath(
    configuration["Switchboard:BrowserRoot"]
    ?? Environment.GetEnvironmentVariable("SWITCHBOARD_BROWSER_ROOT")
    ?? "dist/app/browser");

app.MapGet("/api/ping", () => Results.Ok(new
{
    ok = true,
    runtime = "aspnet-core",
    renderedAt = DateTimeOffset.UtcNow
}));

app.MapGet("/api/navigation/resolve", async (
    HttpContext http,
    SwitchboardRouter router,
    DemoPrincipalStore principals,
    string? path,
    string? target,
    CancellationToken cancellationToken) =>
{
    NoStore(http.Response);
    var requested = !string.IsNullOrWhiteSpace(path) ? path : target;
    if (string.IsNullOrWhiteSpace(requested))
        return Results.BadRequest(new { error = "Invalid path." });

    var resolution = await router.ResolveAsync(
        requested,
        principals.Read(http.Request),
        cancellationToken);

    return resolution is null
        ? Results.NotFound(new { error = "Frame not found." })
        : Results.Ok(resolution);
});

app.MapGet("/api/navigation/modules/{artifactKey}/{hash}", async (
    HttpContext http,
    SwitchboardRouter router,
    DemoPrincipalStore principals,
    string artifactKey,
    string hash,
    CancellationToken cancellationToken) =>
{
    NoStore(http.Response);
    var artifact = await router.ResolveModuleAsync(
        artifactKey,
        hash,
        principals.Read(http.Request),
        cancellationToken);
    if (artifact is null)
        return Results.NotFound();

    var absolute = router.ResolveArtifactPath(artifact.File);
    if (!File.Exists(absolute))
        return Results.NotFound();

    http.Response.Headers["X-Content-Type-Options"] = "nosniff";
    return Results.File(absolute, "text/javascript; charset=utf-8", enableRangeProcessing: false);
});

app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(browserRoot) });
app.UseStaticFiles(new StaticFileOptions { FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(browserRoot) });
app.MapFallback(async context =>
{
    var index = Path.Combine(browserRoot, "index.html");
    if (!File.Exists(index)) { context.Response.StatusCode = 404; return; }
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(index);
});

app.Run();

static void NoStore(HttpResponse response)
{
    response.Headers["Cache-Control"] = "private, no-store";
    response.Headers["Vary"] = "Cookie, Authorization";
}
