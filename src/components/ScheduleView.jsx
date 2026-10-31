import React, { useEffect, useMemo, useState, useCallback } from "react"
import StateLoading from "./StateLoading"
import StateEmpty from "./StateEmpty"
import StateError from "./StateError"
import ScheduleLessonCard from "./ScheduleLessonCard"
import { fetchScheduleGrades, fetchGroupsForGrade, fetchScheduleForGroup, fetchScheduleTimeList } from "../api/schedule"
import {
    DAY_NAMES,
    SHORT_DAY_NAMES,
    DEFAULT_TIME_SLOTS,
    buildTimeSlots,
    mergeScheduleData,
    groupByDay,
    filterByWeek,
    formatGroupName,
    formatGradeName
} from "../utils/schedule"

const STORAGE_KEY_GRADE = "schedule_grade_id"
const STORAGE_KEY_GROUP = "schedule_group_id"

const WEEK_OPTIONS = [
    { value: "all", label: "Все недели" },
    { value: "upper", label: "Верхняя" },
    { value: "lower", label: "Нижняя" }
]

function readStored(key, fallback = "") {
    try {
        return localStorage.getItem(key) || fallback
    } catch {
        return fallback
    }
}

function writeStored(key, value) {
    try {
        localStorage.setItem(key, value)
    } catch {
        return
    }
}

export default function ScheduleView() {
    const [grades, setGrades] = useState([])
    const [gradeId, setGradeId] = useState("")
    const [groups, setGroups] = useState([])
    const [groupId, setGroupId] = useState("")
    const [schedule, setSchedule] = useState(null)
    const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS)
    const [weekType, setWeekType] = useState("all")
    const [request, setRequest] = useState("loading")
    const [error, setError] = useState("")

    const loadGroups = useCallback(async (gid, { force = false } = {}) => {
        const list = await fetchGroupsForGrade(gid, { force })
        setGroups(list)
        return list
    }, [])

    const loadSchedule = useCallback(async (gid, { force = false } = {}) => {
        setRequest("loading")
        setError("")
        try {
            const data = await fetchScheduleForGroup(gid, { force })
            setSchedule(data)
            setRequest("success")
        } catch (e) {
            setError(e.message || "Не удалось загрузить расписание")
            setRequest("error")
        }
    }, [])

    const pickDefaultGroup = useCallback((list, preferredId) => {
        const match = preferredId && list.find((g) => String(g.id) === String(preferredId))
        if (match) return match
        const fiit4 = list.find((g) => String(g.name).toUpperCase().includes("ФИИТ") && Number(g.num) === 4)
        return fiit4 || list[0] || null
    }, [])

    const selectGrade = useCallback(async (gid, { force = false } = {}) => {
        setRequest("loading")
        setError("")
        setGradeId(gid)
        setGroupId("")
        setGroups([])
        setSchedule(null)
        writeStored(STORAGE_KEY_GRADE, gid)
        const list = await loadGroups(gid, { force })
        if (!list.length) {
            setGroups([])
            setGroupId("")
            setSchedule(null)
            setRequest("success")
            return
        }
        const storedGroup = readStored(STORAGE_KEY_GROUP, "")
        const next = pickDefaultGroup(list, storedGroup)
        setGroupId(String(next.id))
        writeStored(STORAGE_KEY_GROUP, String(next.id))
        await loadSchedule(next.id, { force })
    }, [loadGroups, loadSchedule, pickDefaultGroup])

    const bootstrap = useCallback(async (force = false) => {
        setRequest("loading")
        setError("")
            try {
                const [gradeList, timeList] = await Promise.all([
                    fetchScheduleGrades({ force }),
                    fetchScheduleTimeList({ force }).catch(() => [])
                ])
                setTimeSlots(buildTimeSlots(timeList))
                setGrades(gradeList)

                const storedGrade = readStored(STORAGE_KEY_GRADE, "")
                const preferred = gradeList.find((g) => String(g.id) === String(storedGrade))
                const fallback = preferred
                    || gradeList.find((g) => g.degree === "bachelor" && Number(g.num) === 2)
                    || gradeList[0]

                if (fallback) {
                    await selectGrade(String(fallback.id), { force })
                } else {
                    setRequest("success")
                }
            } catch (e) {
                setError(e.message || "Не удалось загрузить курсы")
                setRequest("error")
            }
    }, [selectGrade])

    useEffect(() => {
        bootstrap()
    }, [bootstrap])

    const handleGradeChange = async (event) => {
        const gid = event.target.value
        if (!gid) return
        try {
            await selectGrade(gid)
        } catch (e) {
            setError(e.message || "Не удалось загрузить группы")
            setRequest("error")
        }
    }

    const handleGroupChange = async (event) => {
        const gid = event.target.value
        if (!gid) return
        setGroupId(gid)
        writeStored(STORAGE_KEY_GROUP, gid)
        await loadSchedule(gid)
    }

    const handleWeekChange = (value) => {
        setWeekType(value)
    }

    const handleRetry = async () => {
        try {
            if (groupId) {
                await loadSchedule(groupId, { force: true })
            } else if (grades.length) {
                await selectGrade(gradeId || String(grades[0].id), { force: true })
            } else {
                await bootstrap(true)
            }
        } catch (e) {
            setError(e.message || "Не удалось загрузить расписание")
            setRequest("error")
        }
    }

    const merged = useMemo(() => {
        if (!schedule) return []
        return mergeScheduleData(schedule.lessons, schedule.curricula)
    }, [schedule])

    const grouped = useMemo(() => {
        if (request !== "success") return {}
        return groupByDay(filterByWeek(merged, weekType))
    }, [merged, weekType, request])

    const todayIndex = (() => {
        const day = new Date().getDay()
        return day === 0 ? -1 : day - 1
    })()

    const selectedGroup = groups.find((g) => String(g.id) === String(groupId)) || null
    const hasAnyLessons = merged.length > 0

    return (
        <section className="sched-view">
            <div className="card sched-toolbar">
                <div className="sched-picker">
                    <label className="field field--inline">
                        <span>Курс</span>
                        <select className="input select" value={String(gradeId)} onChange={handleGradeChange} disabled={request === "loading"}>
                            {grades.map((grade) => (
                                <option key={String(grade.id)} value={String(grade.id)}>
                                    {formatGradeName(grade)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="field field--inline">
                        <span>Группа</span>
                        <select className="input select" value={String(groupId)} onChange={handleGroupChange} disabled={!groups.length || request === "loading"}>
                            {groups.length === 0 ? (
                                <option value="">Группы не найдены</option>
                            ) : (
                                groups.map((group) => (
                                    <option key={String(group.id)} value={String(group.id)}>
                                        {formatGroupName(group)}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>

                    <div className="sched-week-toggle" role="group" aria-label="Неделя">
                        {WEEK_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`seg__item ${weekType === option.value ? "seg__item--active" : ""}`.trim()}
                                aria-pressed={weekType === option.value}
                                onClick={() => handleWeekChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn btn--light" type="button" onClick={handleRetry} disabled={request === "loading"}>
                    Обновить
                </button>
            </div>

            {request === "loading" && (
                <div className="card sched-panel">
                    <StateLoading />
                </div>
            )}

            {request === "error" && (
                <div className="card sched-panel">
                    <StateError title="Не удалось загрузить расписание" details={error} onRetry={handleRetry} />
                </div>
            )}

            {request === "success" && !hasAnyLessons && (
                <div className="card sched-panel">
                    <StateEmpty
                        title="Расписание пока пусто"
                        description="На ближайшую неделю занятий не нашлось. Возможно, учебный год ещё не начался или расписание не опубликовано."
                    />
                </div>
            )}

            {request === "success" && hasAnyLessons && (
                <div className="sched-scroll">
                    <div className="sched-grid">
                        {DAY_NAMES.map((dayName, index) => {
                            const isToday = index === todayIndex
                            const lessons = grouped[index] || []
                            const starts = [...new Set([...timeSlots.map((slot) => slot.start), ...lessons.map((lesson) => lesson.start)])].sort()

                            return (
                                <div className={`sched-day ${isToday ? "sched-day-today" : ""}`} key={dayName}>
                                    <div className="sched-day-head">
                                        <span className="sched-day-name">{dayName}</span>
                                        <span className="sched-day-short">{SHORT_DAY_NAMES[index]}</span>
                                        {isToday && <span className="sched-today">сегодня</span>}
                                    </div>
                                    <div className="sched-day-body">
                                        {lessons.length === 0 && (
                                            <p className="sched-day-empty">Нет занятий</p>
                                        )}
                                        {lessons.length > 0 && starts.map((start) => {
                                            const slot = timeSlots.find((item) => item.start === start)
                                            const matchingLessons = lessons.filter((lesson) => lesson.start === start)
                                            if (!matchingLessons.length) {
                                                return <div className="sched-window" key={start} aria-hidden="true">Окно</div>
                                            }
                                            return matchingLessons.map((lesson) => <ScheduleLessonCard key={`${start}-${lesson.id}`} lesson={lesson} pairNum={slot?.num} />)
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <p className="footer-credit sched-credit">
                {selectedGroup ? `Расписание · ${formatGroupName(selectedGroup)}` : "Расписание"}
            </p>
        </section>
    )
}
