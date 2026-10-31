function timeMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const hours = Number(match[1])
    const minutes = Number(match[2])
    return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

export function getTodayLessons(schedule, now) {
    const day = now.getDay() - 1
    if (day < 0) return []
    return schedule
        .filter((lesson) => lesson.day === day)
        .sort((a, b) => (timeMinutes(a.start) ?? 1440) - (timeMinutes(b.start) ?? 1440))
}

export function getLessonTiming(lesson, now, weekType = "all") {
    const start = timeMinutes(lesson.start)
    const end = timeMinutes(lesson.end)
    const valid = start !== null && end !== null && end > start
    const current = now.getHours() * 60 + now.getMinutes()
    const knownWeek = lesson.type === "full" || (weekType !== "all" && lesson.type === weekType)
    return {
        timeLabel: valid ? `${lesson.start}–${lesson.end}` : "Время не указано",
        isNow: valid && knownWeek && start <= current && current < end,
        isPast: valid && end <= current
    }
}

export function formatLessonRooms(lesson) {
    const rooms = [...new Set((lesson.curricula || [])
        .map((item) => String(item.roomname || "").trim())
        .filter(Boolean))]
    return rooms
        .map((room) => /^(?:ауд\.?|аудитория)(?:\s|\d|$)/i.test(room) ? room : `ауд. ${room}`)
        .join(", ")
}
