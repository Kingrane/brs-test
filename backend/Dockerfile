# Build stage. The publish targets linux-x64 explicitly, because Render builds
# inside a Linux container - a host-arch build would emit a Windows apphost.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .

RUN dotnet publish BrsBackend.csproj \
    -c Release \
    -r linux-x64 \
    --self-contained false \
    -o /app

# Runtime stage. aspnet:10.0 carries the ASP.NET Core shared runtime, which the
# --self-contained false output above expects.
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /app ./

ENV ASPNETCORE_ENVIRONMENT=Production
# Render overrides PORT with its own value; this is only the local default.
ENV PORT=8080
EXPOSE 8080

# No .exe suffix - that is the linux-x64 apphost produced by the publish above.
CMD ["./BrsBackend"]
