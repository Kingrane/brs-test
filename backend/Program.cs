using BrsBackend;

var builder = WebApplication.CreateBuilder(args);

// Render sets PORT; without it Kestrel keeps its default http://localhost:5000.
if (Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } port)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var insecureTls = Environment.GetEnvironmentVariable("GRADE_INSECURE_TLS") is "1" or "true";

builder.Services
    .AddHttpClient<GradeApi>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(12);
        client.DefaultRequestHeaders.TryAddWithoutValidation("user-agent", "grade-student-web/0.1");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = insecureTls
            ? HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            : null,
    });

// The Vite dev server and the deployed frontend call this API from another origin.
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .AllowAnyOrigin()
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Json(new
{
    status = "ok",
    gradeOrigin = GradeApi.GradeOrigin,
}));

app.MapStudentApi();

app.Run();
