import React, { useEffect, useMemo, useState, useCallback } from "react"
import StateLoading from "./StateLoading"
import StateEmpty from "./StateEmpty"
import StateError from "./StateError"
import ScheduleLessonCard from "./ScheduleLessonCard"
import SlidingCapsule from "./SlidingCapsule"
import { fetchScheduleGrades, fetchGroupsForGrade, fetchScheduleForGroup, fetchScheduleTimeList } from "../api/schedule"
import {
    DAY_NAMES,
    SHORT_DAY_NAMES,
    DEFAULT_TIME_SLOTS,
    buildTimeSlots,
    buildScheduleRows,
    mergeScheduleData,
    groupByDay,
    filterByWeek,
    formatGroupName,
    formatGradeName
} from "../utils/schedule"

const STORAGE_KEY_GRADE = "schedule_grade_id"
const STORAGE_KEY_GROUP = "schedule_group_id"

const WEEK_OPTIONS = [
    { value: "all", label: "Все", ariaLabel: "Все недели" },
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
    const [selectedDay, setSelectedDay] = useState(() => Math.max(0, new Date().getDay() - 1))
    const [dayDirection, setDayDirection] = useState(1)

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
    const selectedGrade = grades.find((g) => String(g.id) === String(gradeId)) || null
    const hasAnyLessons = merged.length > 0
    const rows = useMemo(() => buildScheduleRows(timeSlots, filterByWeek(merged, weekType)), [timeSlots, merged, weekType])
    const dayLessons = (grouped[selectedDay] || []).slice().sort((a, b) => a.start.localeCompare(b.start))
    const selectDay = (index) => {
        setDayDirection(index > selectedDay ? 1 : -1)
        setSelectedDay(index)
    }
    const handleDayKeyDown = (event, index) => {
        const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
        if (!offset && event.key !== "Home" && event.key !== "End") return
        event.preventDefault()
        const next = event.key === "Home" ? 0 : event.key === "End" ? 5 : (index + offset + 6) % 6
        selectDay(next)
        event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
    }

    return (
        <section className="sched-view">
            <header className="sched-heading">
                <div className="sched-heading-copy">
                    <h1 className="sched-title">Расписание</h1>
                    <p className="sched-summary">
                        {selectedGrade ? formatGradeName(selectedGrade) : "Выберите курс"}
                        {selectedGroup && <> <span aria-hidden="true">/</span> {formatGroupName(selectedGroup)}</>}
                        <span aria-hidden="true"> / </span>
                        {weekType === "all" ? "Все недели" : `Неделя: ${weekType === "upper" ? "верхняя" : "нижняя"}`}
                    </p>
                </div>
                <div className="sched-toolbar">
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
                    </div>
                    <SlidingCapsule className="sched-week-toggle" activeKey={weekType} role="group" aria-label="Неделя">
                        {WEEK_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`seg__item ${weekType === option.value ? "seg__item--active" : ""}`.trim()}
                                aria-pressed={weekType === option.value}
                                aria-label={option.ariaLabel}
                                onClick={() => handleWeekChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </SlidingCapsule>
                    <button className="btn btn--light sched-refresh" type="button" onClick={handleRetry} disabled={request === "loading"} aria-label="Обновить расписание">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 11a8 8 0 1 0-2.3 5.6M20 5v6h-6" />
                        </svg>
                        <span>Обновить</span>
                    </button>
                </div>
            </header>

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
                <>
                    <div className="sched-scroll" role="region" aria-label="Расписание на неделю. Таблица с горизонтальной прокруткой" tabIndex="0">
                        <table className="sched-matrix">
                            <colgroup><col className="sched-time-col" />{DAY_NAMES.map(day => <col key={day} />)}</colgroup>
                            <thead>
                                <tr>
                                    <th scope="col" className="sched-time-cell">Время</th>
                                    {DAY_NAMES.map((day, index) => (
                                        <th scope="col" className={index === todayIndex ? "sched-cell-today" : ""} key={day}>
                                            {day}
                                            {index === todayIndex && <span className="sched-today">сегодня</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(slot => (
                                    <tr key={slot.start}>
                                        <th scope="row" className="sched-time-cell"><strong>{slot.start}</strong><span>{slot.end}</span></th>
                                        {DAY_NAMES.map((day, index) => {
                                            const matching = (grouped[index] || []).filter(lesson => lesson.start === slot.start)
                                            return (
                                                <td className={index === todayIndex ? "sched-cell-today" : ""} key={day}>
                                                    {matching.length ? matching.map((lesson, lessonIndex) => (
                                                        <ScheduleLessonCard key={`${weekType}:${lesson.id}:${lessonIndex}`} lesson={lesson} compact showTime={lesson.end !== slot.end} />
                                                    )) : <span className="sched-cell-empty" aria-label="Нет занятий">—</span>}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="sched-mobile">
                        <SlidingCapsule className="sched-days" activeKey={selectedDay} role="tablist" aria-label="Дни недели">
                            {DAY_NAMES.map((day, index) => (
                                <button key={day} className="sched-day-button" type="button" role="tab" id={`schedule-day-${index}`} aria-controls="schedule-day-panel" aria-label={day} aria-selected={selectedDay === index} tabIndex={selectedDay === index ? 0 : -1} onClick={() => selectDay(index)} onKeyDown={event => handleDayKeyDown(event, index)}>
                                    {SHORT_DAY_NAMES[index]}
                                    {index === todayIndex && <span className="sched-day-dot" aria-hidden="true" />}
                                </button>
                            ))}
                        </SlidingCapsule>
                        <section className="sched-day-panel" role="tabpanel" id="schedule-day-panel" aria-labelledby={`schedule-day-${selectedDay}`} tabIndex="0" key={`${selectedDay}:${weekType}`} style={{ "--day-direction": dayDirection }}>
                            <div className="sched-mobile-head"><h2>{DAY_NAMES[selectedDay]}</h2>{selectedDay === todayIndex && <span className="sched-today">сегодня</span>}</div>
                            {dayLessons.length ? dayLessons.map((lesson, index) => <ScheduleLessonCard key={`${lesson.id}:${index}`} lesson={lesson} />) : <StateEmpty title="Нет занятий" description="На выбранной неделе в этот день пар нет." />}
                        </section>
                    </div>
                </>
            )}

            <p className="footer-credit sched-credit">
                {selectedGroup ? `Расписание · ${formatGroupName(selectedGroup)}` : "Расписание"}
            </p>
        </section>
    )
}
