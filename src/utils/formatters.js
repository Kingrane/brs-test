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

/**
 * Normalizes RSS 2.0 / XML-parsed JSON from /api/v0/events into array of event items.
 */
export function parseEventsData(json) {
    if (!json) return []

    let rawList = null

    if (json.rss?.channel?.item) {
        rawList = json.rss.channel.item
    } else if (json.channel?.item) {
        rawList = json.channel.item
    } else if (Array.isArray(json)) {
        rawList = json
    } else if (Array.isArray(json.response)) {
        rawList = json.response
    } else if (json.response?.events?.event) {
        rawList = json.response.events.event
    } else if (json.events?.event) {
        rawList = json.events.event
    } else if (json.Events?.Event) {
        rawList = json.Events.Event
    } else if (json.response?.Event) {
        rawList = json.response.Event
    } else if (typeof json === 'object') {
        for (const key of Object.keys(json)) {
            if (Array.isArray(json[key])) {
                rawList = json[key]
                break
            } else if (typeof json[key] === 'object' && json[key] !== null) {
                for (const subKey of Object.keys(json[key])) {
                    if (Array.isArray(json[key][subKey])) {
                        rawList = json[key][subKey]
                        break
                    }
                }
            }
        }
    }

    if (!rawList) {
        if (typeof json === 'object' && !Array.isArray(json) && (json.title || json.pubDate || json.Event)) {
            rawList = [json]
        } else {
            return []
        }
    }

    if (!Array.isArray(rawList)) {
        rawList = [rawList]
    }

    return rawList.map((item, idx) => {
        const rawDate = item.pubDate || item.PubDate || item.Date || item.date || item.EventDate || item['@_date'] || item.CreatedDate || item.Timestamp
        let dateFormatted = '-'
        if (rawDate) {
            const parsed = new Date(rawDate)
            dateFormatted = !isNaN(parsed.getTime())
                ? parsed.toLocaleDateString('ru-RU') + ' ' + parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : String(rawDate)
        }

        const eventName = item.title || item.Title || item.Event || item.event || item.Action || item.EventName || item['@_title'] || item['@_event'] || item.Description || 'выставлены баллы'
        const teacher = item.author || item.Author || item.teacher || item.Teacher || item.TeacherName || item['@_teacher'] || item['@_author'] || '-'
        const discipline = item.category || item.Category || item.discipline || item.Discipline || item.subject || item.Subject || item.SubjectName || item['@_subject'] || '-'
        
        let value = item.value ?? item.Value ?? item.score ?? item.Score ?? item.rate ?? item.Rate ?? item.mark ?? item.Mark ?? item['@_value'] ?? item['@_score'] ?? '-'
        let section = item.section || item.Section || item.module || item.Module || item.ModuleTitle || item['@_module'] || item['@_section'] || '-'
        let subsection = item.subsection || item.Subsection || item.submodule || item.Submodule || item.SubmoduleTitle || item['@_submodule'] || item['@_subsection'] || '-'

        // Extract section/subsection/value from RSS description string if available (e.g., "Раздел: ...; Подраздел: ...; Значение: 45")
        const descStr = String(item.description || item.Description || '')
        if (descStr) {
            const sectionMatch = descStr.match(/Раздел:\s*([^;]+)/i)
            if (sectionMatch && section === '-') section = sectionMatch[1].trim()

            const subsectionMatch = descStr.match(/Подраздел:\s*([^;]+)/i)
            if (subsectionMatch && subsection === '-') subsection = subsectionMatch[1].trim()

            const valueMatch = descStr.match(/(?:Значение|Балл|Оценка):\s*([^;]+)/i)
            if (valueMatch && value === '-') value = valueMatch[1].trim()
        }

        return {
            id: item.guid || item.id || item.ID || item['@_id'] || `${idx}-${dateFormatted}`,
            date: dateFormatted,
            event: typeof eventName === 'object' ? (eventName['#text'] || JSON.stringify(eventName)) : String(eventName),
            teacher: typeof teacher === 'object' ? formatTeacherShortName(teacher) : String(teacher),
            discipline: typeof discipline === 'object' ? (discipline.SubjectName || discipline.Name || discipline['#text'] || JSON.stringify(discipline)) : String(discipline),
            value: String(value),
            section: String(section),
            subsection: String(subsection)
        }
    })
}
