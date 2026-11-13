export function normalizeNumber(value) {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

export function formatDisciplinePoints(discipline) {
    const rate = discipline?.Rate != null && discipline.Rate !== "" ? normalizeNumber(discipline.Rate) : null
    const max = normalizeNumber(discipline?.MaxCurrentRate)
    if (max !== null && max > 0) return `${rate ?? "—"} / ${max} б.`
    return rate !== null ? `${rate} б.` : "—"
}

export function formatDisciplineType(type) {
    const key = String(type || "").toLowerCase()
    const map = {
        exam: "Экзамен",
        credit: "Зачет",
        test: "Тест",
        difftest: "Дифференцированный зачет",
        coursework: "Курсовая работа",
        practice: "Практика",
        lecture: "Лекция",
        seminar: "Семинар",
        laboratory: "Лабораторная",
        lab: "Лабораторная"
    }
    return map[key] || type || "-"
}

export function formatTeacherShortName(teacher) {
    if (!teacher) return "Преподаватель"
    const lastName = teacher.LastName || ""
    const firstInitial = (teacher.FirstName || "").slice(0, 1)
    const secondInitial = (teacher.SecondName || "").slice(0, 1)
    const compactInitials = [firstInitial, secondInitial].filter(Boolean).map((v) => `${v}.`).join("")
    const fallback = teacher.Name || ""
    if (lastName) {
        return `${lastName} ${compactInitials}`.trim()
    }
    return fallback || "Преподаватель"
}

export function formatSemesterLabel(semester) {
    if (!semester) return "Семестр"
    const season = semester.Season === "spring"
        ? "Весна"
        : semester.Season === "autumn"
            ? "Осень"
            : "Семестр"
    const year = semester.CalendarYear || semester.Year || "-"
    return `${season} ${year}`
}

export function getGradeToneByPercent(percent) {
    if (percent === null) return "muted"
    if (percent >= 85) return "excellent"
    if (percent >= 70) return "good"
    if (percent >= 50) return "mid"
    return "bad"
}

export function getGradePresentation(mark, discipline) {
    const rate = normalizeNumber(discipline?.Rate)
    const maxRate = normalizeNumber(discipline?.MaxCurrentRate)
    const percent = rate !== null && maxRate !== null && maxRate > 0
        ? Math.round((rate / maxRate) * 100)
        : null

    if (percent !== null) {
        return {
            text: `${percent}%`,
            tone: getGradeToneByPercent(percent),
            description: "Процент освоения дисциплины"
        }
    }

    const value = String(mark || "").toUpperCase()
    const map = {
        "5": { text: "100%", tone: "excellent", description: "Оценка 5" },
        "4": { text: "80%", tone: "good", description: "Оценка 4" },
        "3": { text: "60%", tone: "mid", description: "Оценка 3" },
        "2": { text: "40%", tone: "bad", description: "Оценка 2" },
        "ECTS-A": { text: "95%", tone: "excellent", description: "ECTS-A" },
        "ECTS-B": { text: "85%", tone: "good", description: "ECTS-B" },
        "ECTS-C": { text: "75%", tone: "good", description: "ECTS-C" },
        "ECTS-D": { text: "65%", tone: "mid", description: "ECTS-D" },
        "ECTS-E": { text: "55%", tone: "mid", description: "ECTS-E" },
        "ECTS-F": { text: "35%", tone: "bad", description: "ECTS-F" },
        "PASS": { text: "100%", tone: "excellent", description: "Зачет" },
        "FAIL": { text: "40%", tone: "bad", description: "Незачет" },
        "ЗАЧЁТ": { text: "100%", tone: "excellent", description: "Зачет" },
        "НЕЗАЧЁТ": { text: "40%", tone: "bad", description: "Незачет" }
    }
    return map[value] || { text: "-", tone: "muted", description: "Не определено" }
}

export function getIndexTeachersForDiscipline(teachersMap, disciplineID) {
    if (!teachersMap) return []
    const value = teachersMap[String(disciplineID)] || teachersMap[disciplineID]
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === "object") return Object.values(value)
    return []
}

function textOf(value) {
    if (value === undefined || value === null) return ''
    if (typeof value === 'object') return String(value['#text'] ?? value['@_text'] ?? '')
    return String(value)
}

/**
 * "2026-11-12 14:37:27.051645" -> "12.11.2026 14:37:27".
 * The upstream fraction has six digits, which `new Date()` refuses to parse.
 */
export function formatEventDate(raw) {
    const value = textOf(raw).trim()
    if (!value) return '-'

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
        const [, year, month, day, hours, minutes, seconds] = match
        return `${day}.${month}.${year} ${hours}:${minutes}${seconds ? `:${seconds}` : ''}`
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return `${parsed.toLocaleDateString('ru-RU')} ${parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

// The v0 feed packs every detail into one HTML-ish <description>.
const EVENT_DESCRIPTION_FIELDS = [
    ['discipline', /Предмет:\s*([^<]+)/i],
    ['value', /Отметка:\s*([^<]+)/i],
    ['section', /Модуль:\s*([^<]+)/i],
    ['subsection', /Мероприятие:\s*([^<]+)/i],
    ['teacher', /Преподаватель:\s*([^<]+)/i]
]

function parseEventDescription(description) {
    const fields = {}
    const value = textOf(description)
    if (!value) return fields
    EVENT_DESCRIPTION_FIELDS.forEach(([key, pattern]) => {
        const match = value.match(pattern)
        if (match) fields[key] = match[1].trim()
    })
    return fields
}

function pickEventList(json) {
    if (!json) return null
    if (json.rss?.channel?.item) return json.rss.channel.item
    if (json.channel?.item) return json.channel.item
    if (Array.isArray(json)) return json
    if (Array.isArray(json.response)) return json.response
    if (json.response?.events?.event) return json.response.events.event
    if (json.events?.event) return json.events.event
    if (json.Events?.Event) return json.Events.Event
    if (json.response?.Event) return json.response.Event
    if (typeof json === 'object' && (json.title || json.pubDate || json.Event)) return [json]
    return null
}

/**
 * Normalizes the RSS 2.0 feed from /api/v0/events into an array of event items.
 */
export function parseEventsData(json) {
    const rawList = pickEventList(json)
    if (!rawList) return []

    const list = Array.isArray(rawList) ? rawList : [rawList]

    return list.map((item, idx) => {
        const rawDate = item.published || item.updated || item.pubDate || item.PubDate || item.Date || item.date || item['@_date']
        const date = formatEventDate(rawDate)
        const description = parseEventDescription(item.description || item.Description)

        const eventName = textOf(item.title || item.Title || item.Event || item.event || item.Action) || 'событие'
        const teacher = description.teacher
            || textOf(item.author || item.Author || item.teacher || item.Teacher || item.TeacherName)
            || '-'
        const discipline = description.discipline
            || textOf(item.category || item.Category || item.discipline || item.Discipline || item.subject || item.Subject)
            || '-'
        const value = description.value ?? item.value ?? item.Value ?? item.score ?? item.Score ?? item.mark ?? item.Mark ?? '-'
        const section = description.section ?? item.section ?? item.Section ?? item.module ?? item.Module ?? '-'
        const subsection = description.subsection ?? item.subsection ?? item.Subsection ?? item.submodule ?? item.Submodule ?? '-'

        return {
            id: textOf(item.id || item.guid || item.ID) || `${idx}-${date}`,
            date,
            event: eventName,
            teacher,
            discipline,
            value: String(value),
            section: String(section),
            subsection: String(subsection)
        }
    })
}
