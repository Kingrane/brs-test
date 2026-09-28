using System.Text;

namespace BrsBackend;

/// <summary>
/// Port of api/_gradeFetch.js and api/_studentApi.js.
/// The browser cannot call grade.sfedu.ru directly (CORS), so every call goes
/// through this server and the response is handed back untouched.
/// </summary>
public sealed class GradeApi
{
    public const string GradeOrigin = "https://grade.sfedu.ru";

    private const string ApiBase = "/api/v1";

    private readonly HttpClient _http;

    public GradeApi(HttpClient http) => _http = http;

    /// <summary>URL-encodes entries and drops empty values, like URLSearchParams.</summary>
    public static string BuildQuery(params (string Key, string? Value)[] entries) =>
        string.Join('&', entries
            .Where(entry => !string.IsNullOrEmpty(entry.Value))
            .Select(entry => $"{Uri.EscapeDataString(entry.Key)}={Uri.EscapeDataString(entry.Value!)}"));

    public Task<GradeResponse> ProxyAsync(string path, params (string Key, string? Value)[] query) =>
        GetAsync(ApiBase + path, BuildQuery(query));

    public async Task<GradeResponse> GetAsync(string absolutePath, string? query = null)
    {
        var url = GradeOrigin + absolutePath + (string.IsNullOrEmpty(query) ? "" : "?" + query);

        using var response = await _http.GetAsync(url);
        var body = await response.Content.ReadAsByteArrayAsync();

        return new GradeResponse(
            (int)response.StatusCode,
            response.IsSuccessStatusCode,
            body,
            response.Content.Headers.ContentType?.ToString());
    }

    public sealed class GradeResponse(int status, bool isSuccess, byte[] body, string? contentType)
    {
        public int Status { get; } = status;
        public bool IsSuccess { get; } = isSuccess;
        public byte[] Body { get; } = body;
        public string? ContentType { get; } = contentType;

        public string Text { get; } = new StreamReader(
            new MemoryStream(body), Encoding.UTF8, detectEncodingFromByteOrderMarks: true).ReadToEnd();
    }
}
