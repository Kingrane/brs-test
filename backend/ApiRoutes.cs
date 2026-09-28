namespace BrsBackend;

public static class ApiRoutes
{
    public static void MapStudentApi(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/student/semester_list", (HttpContext ctx, GradeApi grade, string? token)
            => SemesterList(ctx, grade, token));

        app.MapGet("/api/student/index", (HttpContext ctx, GradeApi grade, string? token, string? SemesterID)
            => Index(ctx, grade, token, SemesterID));

        app.MapGet("/api/student/discipline/journal", (HttpContext ctx, GradeApi grade, string? token, string? id)
            => JournalOrSubject(ctx, grade, "/student/discipline/journal", token, id));

        app.MapGet("/api/student/discipline/subject", (HttpContext ctx, GradeApi grade, string? token, string? id)
            => JournalOrSubject(ctx, grade, "/student/discipline/subject", token, id));

        app.MapGet("/api/student/discipline/events", Events);
        app.MapGet("/api/student/events", Events);
    }

    private static async Task SemesterList(HttpContext ctx, GradeApi grade, string? token)
    {
        if (TokenError(token) is { } error)
        {
            await Error(ctx, 400, error);
            return;
        }

        await PassThrough(ctx, await grade.ProxyAsync("/student/semester_list", ("token", token)));
    }

    private static async Task Index(HttpContext ctx, GradeApi grade, string? token, string? semesterId)
    {
        if (TokenError(token) is { } error)
        {
            await Error(ctx, 400, error);
            return;
        }

        await PassThrough(ctx, await grade.ProxyAsync("/student", ("token", token), ("SemesterID", semesterId)));
    }

    private static async Task JournalOrSubject(HttpContext ctx, GradeApi grade, string path, string? token, string? id)
    {
        if (TokenError(token) is { } tokenError)
        {
            await Error(ctx, 400, tokenError);
            return;
        }

        if (IdError(id) is { } idError)
        {
            await Error(ctx, 400, idError);
            return;
        }

        await PassThrough(ctx, await grade.ProxyAsync(path, ("token", token), ("id", id)));
    }

    private static Task Events(HttpContext ctx, GradeApi grade, string? token, string? id,
        string? recordbookID, string? semesterID, string? SemesterID)
    {
        if (ctx.Request.Headers.TryGetValue("x-auth-token", out var header) && !string.IsNullOrEmpty(header))
        {
            token = header;
        }

        if (TokenError(token) is { } error) return Error(ctx, 400, error);

        return ForwardEvents(ctx, grade, GradeApi.BuildQuery(
            ("token", token),
            ("id", id),
            ("recordbookID", recordbookID),
            ("semesterID", semesterID ?? SemesterID)));
    }

    private static async Task ForwardEvents(HttpContext ctx, GradeApi grade, string query)
    {
        // The Node version reached /api/v0/events by letting fetch normalise "/api/v1/../v0/events".
        var upstream = await grade.GetAsync("/api/v0/events", query);
        if (!upstream.IsSuccess)
        {
            var retry = await grade.GetAsync("/api/v1/student/events", query);
            if (retry.IsSuccess) upstream = retry;
        }

        if (!upstream.IsSuccess)
        {
            await Error(ctx, upstream.Status, "Upstream returned an error",
                $"HTTP {upstream.Status}: {Excerpt(upstream.Text)}");
            return;
        }

        Dictionary<string, object?> json;
        try
        {
            json = XmlJson.Parse(upstream.Text);
        }
        catch (Exception)
        {
            // Not XML after all - hand the upstream body over untouched.
            await PassThrough(ctx, upstream);
            return;
        }

        ctx.Response.StatusCode = StatusCodes.Status200OK;
        await ctx.Response.WriteAsJsonAsync(json);
    }

    private static async Task PassThrough(HttpContext ctx, GradeApi.GradeResponse upstream)
    {
        ctx.Response.StatusCode = upstream.Status;
        ctx.Response.ContentType = upstream.ContentType ?? "application/json; charset=utf-8";
        await ctx.Response.Body.WriteAsync(upstream.Body);
    }

    private static Task Error(HttpContext ctx, int status, string error, string? details = null)
    {
        ctx.Response.StatusCode = status;
        return ctx.Response.WriteAsJsonAsync(details is null
            ? new Dictionary<string, string> { ["error"] = error }
            : new Dictionary<string, string> { ["error"] = error, ["details"] = details });
    }

    private static string? TokenError(string? token)
    {
        if (string.IsNullOrEmpty(token)) return "token is required";
        if (token.Trim().Length < 16) return "token is too short";
        return null;
    }

    private static string? IdError(string? id) => string.IsNullOrEmpty(id) ? "id is required" : null;

    private static string Excerpt(string text) => text.Length <= 200 ? text : text[..200];
}
