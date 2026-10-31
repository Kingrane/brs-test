export const DAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
export const SHORT_DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

export const DEFAULT_TIME_SLOTS = [
    { num: 1, start: "08:00", end: "09:35" },
    { num: 2, start: "09:50", end: "11:25" },
    { num: 3, start: "11:55", end: "13:30" },
    { num: 4, start: "13:45", end: "15:20" },
    { num: 5, start: "15:50", end: "17:25" },
    { num: 6, start: "17:40", end: "19:15" },
    { num: 7, start: "19:30", end: "21:05" }
]

export function buildTimeSlots(timeList) {
    if (!Array.isArray(timeList) || !timeList.length) return DEFAULT_TIME_SLOTS
    const pad = (value) => String(value).padStart(2, "0")
    return timeList
        .slice()
        .sort((a, b) => Number(a.num) - Number(b.num))
        .map((slot) => ({
            num: Number(slot.num) + 1,
            start: `${pad(slot.cbeg.hours)}:${pad(slot.cbeg.minutes ?? 0)}`,
            end: `${pad(slot.cend.hours)}:${pad(slot.cend.minutes ?? 0)}`
        }))
}

export function parseTimeslot(timeslotStr) {
    const match = String(timeslotStr || "").match(/\((\d+),(\d+:\d+:\d+),(\d+:\d+:\d+),(\w+)\)/)
    if (!match) return null

    const [, day, start, end, type] = match
    return {
        day: Number(day),
        type,
        typeLabel: type === "full" ? "Обе недели" : type === "upper" ? "Верхняя" : "Нижняя",
        start: start.slice(0, 5),
        end: end.slice(0, 5)
    }
}

export function mergeScheduleData(lessons, curricula) {
    if (!Array.isArray(lessons)) return []
    const curriculaList = Array.isArray(curricula) ? curricula : []

    return lessons
        .map((lesson) => {
            const slot = parseTimeslot(lesson.timeslot)
            const lessonCurricula = curriculaList.filter((c) => Number(c.lessonid) === Number(lesson.id))
            return {
                ...lesson,
                ...slot,
                curricula: lessonCurricula,
                hasSubgroups: Number(lesson.subcount) > 1,
                isLecture: lesson.ctype === true || lesson.ctype === "true"
            }
        })
        .filter((item) => item.day !== undefined)
}

export function groupByDay(schedule) {
    const grouped = Object.fromEntries(DAY_NAMES.map((_, index) => [index, []]))
    schedule.forEach((item) => {
        if (grouped[item.day]) {
            grouped[item.day].push(item)
        }
    })
    return grouped
}

export function filterByWeek(schedule, weekType) {
    if (weekType === "all") return schedule
    return schedule.filter((item) => item.type === "full" || item.type === weekType)
}

export function formatGroupName(group) {
    if (!group) return "Группа"
    const name = String(group.name || "")
    const num = group.num === undefined || group.num === null ? "" : `-${group.num}`
    return `${name}${num}`.trim()
}

export function formatGradeName(grade) {
    if (!grade) return "Курс"
    const degree = String(grade.degree || "")
    const degreeLabel = degree === "bachelor"
        ? "бакалавриат"
        : degree === "master"
            ? "магистратура"
            : degree === "postgraduate"
                ? "аспирантура"
                : degree
    return `${grade.num} курс · ${degreeLabel}`
}

export function shortenFullName(fullName) {
    if (!fullName) return ""
    const parts = String(fullName).trim().split(/\s+/)
    if (parts.length >= 3) {
        return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`
    }
    return fullName
}

export function buildScheduleRows(timeSlots, lessons) {
    const rows = new Map(timeSlots.map(slot => [slot.start, { ...slot }]))
    for (const lesson of lessons) {
        if (!rows.has(lesson.start)) rows.set(lesson.start, { start: lesson.start, end: lesson.end })
    }
    return [...rows.values()].sort((a, b) => a.start.localeCompare(b.start))
}

export function formatScheduleRoom(value) {
    const room = String(value ?? "").trim()
    if (!room || /^(онлайн|online|zoom|teams|ауд\.?|аудитория)/i.test(room)) return room
    return `ауд. ${room}`
}
