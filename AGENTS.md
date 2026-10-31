# Agent Guidelines for brs-test (super-brs)

## Что это за репозиторий

API-first клиент Балльно-рейтинговой системы ЮФУ (`grade.sfedu.ru`) + расписание (`schedule.sfedu.ru`).

Три рантайма:

| Слой | Локально | Продакшен (Vercel) |
| ---- | -------- | ------------------ |
| Web UI | Vite + React 19, dev на `localhost:3000` | статика из `dist/` |
| API-прокси | Express (`server.js`), порт 3000 | serverless-функции из `api/*` |
| Mobile | Expo SDK 54 (Android/iOS) | APK через EAS Build |

Живой деплой: `https://super-brs.vercel.app` (см. `README.md`).

Primary mission:

1. Сохранять единое поведение API между локальным Express и Vercel serverless.
2. Не ломать upstream-совместимость (прокси, никаких lossy-преобразований).
3. Держать фронтенд отзывчивым и production-like.
4. Улучшать дизайн без потери читабельности/доступности.

---

## Карта репозитория

```text
index.html                     # Вход Vite-приложения (ссылается на /src/main.jsx и /styles.css)
vite.config.js                 # плагин react, dev-порт 5173, proxy /api -> :3000
server.js                      # Express: монтирует api/* хендлеры + отдаёт dist/ ИЛИ Vite middleware
vercel.json                    # buildCommand: npm run build, outputDirectory: dist

api/                           # serverless-хендлеры (Vercel) + общие помощники
  _gradeFetch.js               # upstream grade.sfedu.ru: undici, SSL-bypass, таймаут 12s, user-agent
  _http.js                     # sendError / requireMethod / passThroughJson
  _studentApi.js               # buildQuery / validateToken / validateId / proxyStudentEndpoint
  test.js                      # мусор: тривиальный "Hello from API!" (не используется)
  public/index.html            # мусор: легаси-демо "Grades — Student" (не используется)
  student/
    semester_list.js           # GET /api/student/semester_list?token=
    index.js                   # GET /api/student/index?token=&SemesterID=
    events.js                  # реэкспорт discipline/events.js (для /api/student/events)
    discipline/
      journal.js               # GET /api/student/discipline/journal?token=&id=
      subject.js               # GET /api/student/discipline/subject?token=&id=
      events.js                # /events + /student/events: XML -> JSON (fast-xml-parser)

src/                           # ВЕБ-ФРОНТЕНД (Vite + React 19, JSX)
  main.jsx                     # React root mount (StrictMode)
  App.jsx                      # auth-поток, состояние, навигация views, кэш деталей (useRef Map)
  api/
    client.js                  # ENDPOINTS (/api/student/*) + fetchJson с debug-логом
    schedule.js                # schedule.sfedu.ru ПРЯМО из браузера (без прокси), in-memory кэш
  utils/
    formatters.js              # оценки/проценты/типы дисциплин, имена преподавателей, парсер событий
    storage.js                 # localStorage auth (grade_token / grade_remember)
    schedule.js                # дни/слоты, parseTimeslot, mergeScheduleData, groupByDay, filterByWeek
    today.js                   # пары текущего дня, сортировка, время/статус и аудитории; без угадывания недели
  views/
    LoginView.jsx              # экран входа по токену (+кнопка вставки из буфера)
    DashboardView.jsx          # mainNav: disciplines | events | schedule; тулбар с семестром;
                               # master-detail на мобиле; 4 вкладки (Оценка/Журнал/Модули/Преподаватели); debug сохранён, hidden
  components/
    StateLoading.jsx / StateEmpty.jsx / StateError.jsx   # обязательные UX-состояния
    DisciplineCard.jsx         # карточка дисциплины в списке
    TodayCard.jsx              # «Сегодня» под списком: сохранённая группа, ручной фильтр недели, минутный таймер
    TeacherRow.jsx             # строка преподавателя
    JournalTable.jsx           # журнал (таблица)
    EventsTable.jsx            # история событий дисциплины
    ModuleCardList.jsx         # модули + итоговая оценка
    ConfirmDialog.jsx          # диалог подтверждения (выход)
    SlidingCapsule.jsx         # общий скользящий индикатор навигации/вкладок/фильтров, FLIP + reduced motion
    ScheduleView.jsx           # курс -> группа -> неделя; desktop время × 6 дней, mobile выбранный день
    ScheduleLessonCard.jsx     # ячейка/карточка пары; все предметы, преподаватели, аудитории и реальные подгруппы

public/                        # Vite publicDir (копируется в dist как есть)
  styles.css                   # ВЕСЬ CSS (zinc-тема; белый мобильный фон)
  favicon.svg / sfedu.svg      # иконки
  index.html / app.js          # МУСОР: легаси-приложение на htm/React18 (не используется)

docs/
  DESIGN.md                    # адаптации SuperBRS + полный исходный zinc-стильреференс

BRSApp/                        # МОБИЛЬНОЕ ПРИЛОЖЕНИЕ (Expo SDK 54, React Native 0.81)
  App.js                       # SafeAreaProvider + NavigationContainer + Stack (Login -> Main -> Detail)
  index.js                     # AppRegistry entry
  app.json                     # Expo config (имя, иконки, package com.brs.sfedu, projectId)
  eas.json                     # EAS Build profile (preview -> APK)
  src/
    api/client.js              # fetchJson к grade.sfedu.ru НАПРЯМУЮ (API_V1 /api/v1/student, events /api/v0/events + XML)
    utils/storage.js           # AsyncStorage auth
    utils/cache.js             # кэш деталей дисциплины
    utils/helpers.js           # форматирование, валидация токена, парсер событий (parseEventsData)
    theme/index.js             # дизайн-токены (цвета/шрифты/отступы)
    components/                # StateLoading/Empty/Error, GradeBadge, DisciplineCard, TeacherRow,
                               # ModuleCard, JournalTable, SemesterPicker, EventCard
    screens/                   # LoginScreen, DashboardScreen, DetailScreen (5 вкладок, включая История)
    navigation/AppNavigator.js # (легаси-путь; фактически стэк объявлен в App.js)
```

> Мусорные файлы (`public/app.js`, `public/index.html`, `api/test.js`, `api/public/index.html`)
> не удаляю без запроса, но их можно смело игнорировать/удалять — на работу не влияют.
> `README.md` упоминает Tailwind — враньё, в проекте чистый CSS.

---

## Backend / API-контракт

### Методы и валидация

- Каждый хендлер вызывает `requireMethod(req, res, "GET")`.
- Обязательные query-параметры валидируются до upstream-запроса.
- `validateToken` намеренно мягкий (мин. длина 16 симв.) — формат токена может отличаться.
- `events.js` принимает токен и из `x-auth-token` заголовка, и из query.

### Формат ошибок

```json
{ "error": "Human readable", "details": "Optional technical" }
```

- `400` — невалидные/отсутствующие параметры
- `405` — метод не разрешён
- `502` — upstream timeout/сеть/транспорт

### Upstream pass-through

- Прокидываем статус, тело и `content-type` апстрима как есть (без lossy-преобразований).
- Единственное исключение: `events.js` парсит XML в JSON (fallback на pass-through, если не распарсилось).

### Сеть

- `_gradeFetch.js`: таймаут `12_000` ms через `AbortController`, header `user-agent`.
- SSL-bypass (undici `Agent` с `rejectUnauthorized: false`) применён только к `grade.sfedu.ru` —
  у апстрима периодически слетает сертификат (оборванная цепочка). Подробности ниже.

### Таблица эндпоинтов (локально и на Vercel)

| Эндпоинт | Параметры | Upstream |
| -------- | --------- | -------- |
| `/api/student/semester_list` | `token` | `/api/v1/student/semester_list` |
| `/api/student/index` | `token`, `SemesterID` | `/api/v1/student` |
| `/api/student/discipline/journal` | `token`, `id` | `/api/v1/student/discipline/journal` |
| `/api/student/discipline/subject` | `token`, `id` | `/api/v1/student/discipline/subject` |
| `/api/student/discipline/events` | `token`, `id`, `recordbookID`, `semesterID` | `/api/v1/../v0/events` (fallback `/student/events`) |
| `/api/student/events` | то же | то же (реэкспорт events.js) |

---

## Web-фронтенд: как устроен

- **Стек**: Vite 8 + `@vitejs/plugin-react`, React 19, JSX. Без сборки-плагинов CSS — vanilla CSS.
- **Вход**: корневой `index.html` → `src/main.jsx` → `src/App.jsx`. Стили подключены `<link rel="stylesheet" href="/styles.css">` (файл лежит в `public/`).
- **Данные**: `fetchJson` из `src/api/client.js` ходит на относительные `/api/student/*` —
  локально их отдаёт Express (тот же хендлер, что на Vercel), в проде — serverless.
- **Расписание** (`src/api/schedule.js`): запросы идут **прямо из браузера** на `https://schedule.sfedu.ru/APIv1`
  (`grade/list`, `group/forGrade/{id}`, `schedule/group/{id}`, `time/list`), бэкенд-прокси НЕ участвует.
  В `ScheduleView.jsx` выбранные курс/группа запоминаются в localStorage (`schedule_grade_id`, `schedule_group_id`),
  а фильтр недели (Все недели/Верхняя/Нижняя) по умолчанию `all` и **не** персистится.
  При `>768px` — таблица «время × шесть дней» с внутренней горизонтальной прокруткой на узком desktop;
  при `<=768px` — шесть capsule-вкладок и пары одного выбранного дня. День по умолчанию сегодняшний,
  в воскресенье — понедельник; день не персистится. Все пары одного времени и все curriculum-записи сохраняются.
  `buildScheduleRows` добавляет нестандартные начала к слотам API; отличающееся окончание видно в самой ячейке.
- **Кэш**: детали дисциплины кэшируются в `useRef(new Map())` по ключу `semesterID:disciplineID` (`App.jsx`);
  расписание кэшируется in-memory promise-кэшем в `src/api/schedule.js`, общим для `ScheduleView` и `TodayCard`.
- **Сегодня** (`src/components/TodayCard.jsx`, `src/utils/today.js`): группа берётся из `schedule_group_id`;
  без группы карточка скрыта, при `active=false` нет запросов и таймера. Время обновляется раз в минуту.
  Фильтр недели ручной, по умолчанию `all`, не персистится; в `all` условные `upper`/`lower` не получают
  статус «сейчас». ISO-неделя не вычисляется: учебная чётность не угадывается. Карточка под списком дисциплин.
- **UX-состояния**: каждый асинхронный блок обязан иметь loading/empty/error+retry/success.

### Ключевые правила фронта

- UI-копия — русский, домен «БРС ЮФУ».
- Типы дисциплин локализованы: `exam`→Экзамен, `credit`→Зачет, `difftest`→Дифференцированный зачет,
  `coursework`→Курсовая работа, `practice`→Практика.
- Оценка: процент `Rate / MaxCurrentRate`; цвета excellent/good/mid/bad/muted.
- Список дисциплин интерактивен и keyboard-safe; вкладки без layout-shift; debug-панель остаётся в коде с `hidden`.

---

## Визуальная система

- Источник и приоритетные адаптации — `docs/DESIGN.md`. Рабочий React-интерфейс, не лендинг:
  компактная сервисная плотность, без hero/маркетинговых секций. Шрифт Onest с кириллицей, веса 400–700.
- Desktop canvas `#f4f4f5`, карточки `#ffffff`; на `<=768px` фон страницы белый по новому фото пользователя.
  Hairline-рамки 1px `#ececee`, мобильные `#e4e4e7`; без декоративных теней на карточках.
  По фото выбранной дисциплины допускается мягкая тень только под активной белой вкладкой.
- Радиусы: контейнеры 36px, мобильный список 32px, кнопки/поля 14px, строки 16px, бейджи 12px;
  capsule-навигация «Дисциплины» / «Расписание» / «События». Шапка: бренд, семестр, обновление, выход.
- Оценки: excellent `#15803d`, good `#0f766e`, mid `#b45309`, bad `#b91c1c`, пустое — серый muted.
  Пороги `src/utils/formatters.js` остаются `>=85` / `>=70` / `>=50`, не 80/60/40; расчёты и fallback
  не меняются. Если mark отсутствует, доступный процент остаётся; без процента/известного mark — `-`/muted.
  Ember `#ff5a00` только для малых бейджей, не больших заливок или основного текста.
- На `<=768px` заголовок списка вне белой карточки, строки без номеров, названия 16px, метаданные 13px
  с переносом; `TodayCard` под списком. Desktop master-detail — две колонки до мобильного breakpoint.
  Расписание: desktop-таблица времени и шести дней, не три колонки; на `<=768px` переключатель дней и
  карточки только выбранного дня. Заголовки предметов teal, метаданные zinc, верхняя/нижняя неделя подписаны.
- Выбранная дисциплина: заголовок и capsule-вкладки вне отдельной карточки содержимого; модули одной
  карточкой 36px/мобильные 32px, свободные строки с пунктиром, разделители, нейтральный прогресс снизу.
  Бонус/экзамен и расчёты сохранены; известный `Rate` отображается и без `MaxCurrentRate`.
- Модули слегка уплотнены: строки с gap 12px, отступ до строк 14px, разделы 18px + 16px;
  размер текста и все итоги сохранены. При открытии — короткое последовательное появление разделов.
- Движение только `transform`/`opacity`, поддержка `prefers-reduced-motion`, видимый keyboard focus,
  интерактивные цели от 40px. `SlidingCapsule` измеряет выбранную кнопку и двигает один индикатор через FLIP
  (Web Animations API), пересчитывает resize/fonts, отменяет анимацию при reduced motion и cleanup.
  Переключения дней направленные, вкладок — короткий reveal; конечные transform сбрасываются в none.
  Основной CSS-файл `public/styles.css`; debug-панель скрыта атрибутом `hidden`, UX-состояния сохраняются.
- Zinc-редизайн касается только web: `BRSApp/` не затронут, backend/API-контракты не меняются.

---

## Скрипты

### Web

- `npm start` / `npm run dev` → `node server.js` (Express, порт 3000)
- `npm run build` → `vite build` → `dist/`
- `npx vite` (отдельно) → порт 5173 с proxy `/api` → `:3000`

> **Footgun:** `node server.js` отдаёт `dist/`, ЕСЛИ он существует (server.js:44). Пока `dist/` на диске есть,
> правки в `src/` и `public/` НЕ подхватятся без `npm run build`. Если нужен живой dev — удалить `dist/`
> или запускать `vite` напрямую. При конфликте порта `EADDRINUSE` — убить процесс или задать `PORT`.

### Mobile (BRSApp/)

- `npx expo start` — Metro + QR для Expo Go
- `npx eas-cli@latest build --platform android --profile preview` — сборка APK в облаке. **НЕ ЗАПУСКАТЬ БЕЗ ЯВНОГО СПРОСА.**

Мобилка ходит напрямую к `grade.sfedu.ru`, Express ей не нужен. Для сборки APK нужен Expo-аккаунт.

---

## SSL-bypass для grade.sfedu.ru (веб)

У апстрима периодически слетает SSL-сертификат (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), отсюда `fetch failed` / `502`.
Фикс в `api/_gradeFetch.js` и `api/student/discipline/events.js`: `undici` `Agent` с `connect: { rejectUnauthorized: false }`,
применяется точечно к запросам к `grade.sfedu.ru`. Зависимость `undici` в `package.json`.

Мобильное приложение не затронуто (ходит напрямую, свой платформенный SSL).

Проверка фикса: `node server.js` + запрос `/api/student/semester_list?token=...` должен вернуть ответ апстрима
(например `403 Token is broken`), а не `502`.

---

## Quality Checklist перед завершением задачи

Backend:
- [ ] Хендлер в `api/*` использует общие помощники (`_studentApi.js`, `_http.js`, `_gradeFetch.js`).
- [ ] `server.js` монтирует маршрут для локального рантайма.
- [ ] Метод + параметры + схема ошибок соблюдены.
- [ ] Upstream status/body/content-type pass-through сохранён.

Frontend:
- [ ] Loading/empty/error/retry состояния на месте.
- [ ] Мобильный (`<=768px`) и десктоп проверены.
- [ ] Русская копия и доменные термины консистентны.
- [ ] Нет console-ошибок от изменённой логики.

Проект:
- [ ] `node --check` для файлов `api/*` (чистый JS).
- [ ] Для JSX-файлов `src/*` — сборка `npm run build` проходит без ошибок.
- [ ] `git status --short` просмотрен на случайные артефакты.
- [ ] AGENTS.md обновлён, если изменились архитектура/контракты.

---

## Change Management Policy

1. Если меняется контракт эндпоинта — обнови AGENTS.md и ожидания фронтенда.
2. Если меняется UI-поведение — предусмотри fallback на неполную форму ответа API.
3. Новый эндпоинт — подключай и в serverless (`api/*`), и в локальный Express (`server.js`).

Небольшие проверяемые инкременты. Корректность и стабильность важнее флеш-переписок.

---

## Поведение агента

- Не трогать чужой код «заодно» (surgical changes); про легаси-мусор — упомянуть, не удалять.
- Не запускать `eas build`, не пушить в main и не делать merge без явной просьбы.
- Перед реализацией называть допущения; при неоднозначности — спрашивать.
- Минимум кода, решающий задачу; без спекулятивных абстракций.
