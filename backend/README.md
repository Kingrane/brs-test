# BRS backend (C#)

Прокси к `https://grade.sfedu.ru`. Заменяет Node-сервер из `server.js` + папки `api/`.
Нужен потому, что браузер не может ходить в `grade.sfedu.ru` напрямую (CORS) — запрос идёт через сервер, ответ возвращается как есть.

Порт на C# 10, ASP.NET Core, без внешних пакетов.

## Запуск локально

```powershell
cd backend
dotnet run
```

Сервер поднимется на `http://localhost:5000`, страница проверки — на `http://localhost:5000/`.

## Эндпоинты

Все — `GET`. Ответ upstream проксируется без изменений: тот же статус, тот же `Content-Type`, то же тело.

| Путь | Параметры |
|---|---|
| `/api/health` | — |
| `/api/student/semester_list` | `token` |
| `/api/student/index` | `token`, `SemesterID` |
| `/api/student/discipline/journal` | `token`, `id` |
| `/api/student/discipline/subject` | `token`, `id` |
| `/api/student/discipline/events` | `token`, `id`, `recordbookID`, `semesterID` |
| `/api/student/events` | то же, что `discipline/events` |

`token` обязателен и должен быть от 16 символов, иначе 400. `id` обязателен для `journal` и `subject`.
`discipline/events` дополнительно принимает токен в заголовке `x-auth-token` (приоритетнее query-параметра).

`events` идёт сначала на `/api/v0/events`, а при ошибке — на `/api/v1/student/events`; XML с верхнего сервера
конвертируется в JSON (порядок и форма ключей совпадают с `fast-xml-parser`: атрибуты под `@_`, текст под `#text`,
`event`/`Event` всегда массивом).

## Переменные окружения

| Имя | По умолчанию | Что делает |
|---|---|---|
| `PORT` | `8080` в контейнере, иначе `localhost:5000` | Порт прослушивания. Render подставляет свой. |
| `GRADE_INSECURE_TLS` | `false` | `1`/`true` — принимать любой TLS-сертификат от `grade.sfedu.ru`. |

`GRADE_INSECURE_TLS` — эквивалент `rejectUnauthorized: false` из `_gradeFetch.js`. **Выключен**, потому что
проверка сертификата в .NET работает без него (проверено). Включай только если на конкретном хосте вдруг
вылезет ошибка TLS.

## Деплой на Render

**Render не поддерживает .NET нативно** — его рантаймы это Node.js/Bun, Python, Ruby, Go, Rust, Elixir.
Поэтому бэкенд едет как Docker-образ: `Dockerfile` публикует проект под `linux-x64` и запускает его
на `aspnet:10.0`. Render такие образы собирает и запускает штатно.

Blueprint лежит в корне репо — `render.yaml` (Render ищет его именно там, не в `backend/`):

```yaml
services:
  - type: web
    runtime: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
    healthCheckPath: /api/health
```

Либо вручную: New → Web Service → **Runtime: Docker** → Root Directory `backend` → Dockerfile Path `./Dockerfile`
→ Health Check Path `/api/health`. Build/Start Command оставляем пустыми, их задаёт сам Dockerfile.

`PORT` Render подставляет сам, приложение слушает `0.0.0.0:$PORT`. После деплоя открой `https://<адрес>/` —
это страница проверки.

Чтобы фронтенд (`src/api/client.js`) смотрел в этот адрес, а не в относительные `/api/...`, нужно добавить
базовый URL в константу `ENDPOINTS` — пути в таблице выше менять не придётся, они совпадают один в один.

### Проверка сборки без Docker

Docker локально может не быть, а проверить самое рискованное (RID) можно и так:

```powershell
dotnet publish BrsBackend.csproj -c Release -r linux-x64 --self-contained false -o ./out-linux
```

В `out-linux` должен появиться `BrsBackend` **без** `.exe` — это linux-apphost, который запускает `CMD` в Dockerfile.

## Что стоит учесть

- **Токен уходит в query-параметре** — так устроен сам `grade.sfedu.ru`, это не выбор прокси. Из-за этого токен
  может осесть в логах и в истории браузера. ASP.NET в логи пишет адрес как `?*` и сам токен не печатает,
  но ссылки с токеном лучше не расшаривать.
- **CORS открыт на любой origin** — нужно, чтобы фронтенд с другого домена (и Vite на `:5173`) мог ходить сюда.
  Своего токена сервер не хранит и не проверяет, так что доступ к API фактически открыт всем, кто знает адрес.
  Если бэкенд нужен только для себя — сузь `AllowAnyOrigin` в `Program.cs`.
