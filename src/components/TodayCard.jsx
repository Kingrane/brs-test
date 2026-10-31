import React from "react"
import { fetchScheduleForGroup } from "../api/schedule"
import { filterByWeek, mergeScheduleData } from "../utils/schedule"
import { formatLessonRooms, getLessonTiming, getTodayLessons } from "../utils/today"
import SlidingCapsule from "./SlidingCapsule"

const STORAGE_KEY_GROUP = "schedule_group_id"

function readGroupId() {
    try {
        return localStorage.getItem(STORAGE_KEY_GROUP) || ""
    } catch {
        return ""
    }
}

function formatTodayLabel(now) {
    const label = now.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long"
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function TodayCard({ active = true }) {
    const [groupId] = React.useState(readGroupId)
    const [state, setState] = React.useState(groupId ? "loading" : "idle")
    const [schedule, setSchedule] = React.useState([])
    const [weekType, setWeekType] = React.useState("all")
    const [now, setNow] = React.useState(() => new Date())
    const [request, setRequest] = React.useState(0)

    React.useEffect(() => {
        if (!active || !groupId) return
        let ignore = false

        setState("loading")
        fetchScheduleForGroup(groupId, { force: request > 0 })
            .then((data) => {
                if (ignore) return
                setSchedule(mergeScheduleData(data?.lessons, data?.curricula))
                setState("success")
            })
            .catch(() => {
                if (!ignore) setState("error")
            })

        return () => {
            ignore = true
        }
    }, [active, groupId, request])

    React.useEffect(() => {
        if (!active || !groupId) return
        setNow(new Date())
        const interval = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(interval)
    }, [active, groupId])

    if (!active || !groupId) {
        return null
    }

    const todayLessons = getTodayLessons(schedule, now)
    const hasConditionalLessons = todayLessons.some((lesson) => lesson.type === "upper" || lesson.type === "lower")
    const lessons = filterByWeek(todayLessons, weekType)
    const refresh = () => {
        setNow(new Date())
        setRequest((value) => value + 1)
    }

    return (
        <section className="card today" aria-label="Расписание на сегодня">
            <div className="today__head">
                <h2 className="today__title">Сегодня</h2>
                <span className="today__sep" aria-hidden="true">·</span>
                <span className="today__date">{formatTodayLabel(now)}</span>
                <button
                    className="btn btn--quiet btn--sm today__refresh"
                    type="button"
                    onClick={refresh}
                    disabled={state === "loading"}
                >
                    Обновить
                </button>
            </div>

            {state === "success" && hasConditionalLessons && (
                <SlidingCapsule className="today__week" activeKey={weekType} role="group" aria-label="Выберите учебную неделю">
                    {[["all", "Все"], ["upper", "Верхняя"], ["lower", "Нижняя"]].map(([value, label]) => (
                        <button
                            key={value}
                            className={`seg__item${weekType === value ? " seg__item--active" : ""}`}
                            type="button"
                            aria-pressed={weekType === value}
                            onClick={() => setWeekType(value)}
                        >
                            {label}
                        </button>
                    ))}
                </SlidingCapsule>
            )}

            {state === "loading" && (
                <div className="state state-loading" aria-busy="true">
                    <div className="skeleton"></div>
                    <div className="skeleton"></div>
                    <div className="skeleton"></div>
                </div>
            )}

            {state === "error" && (
                <p className="today__state">
                    Расписание недоступно.{" "}
                    <button className="today__retry" type="button" onClick={refresh}>
                        Повторить
                    </button>
                </p>
            )}

            {state === "success" && lessons.length === 0 && (
                <p className="today__state">
                    {todayLessons.length > 0 ? "На выбранной неделе сегодня пар нет." : "Пар нет — свободный день."}
                </p>
            )}

            {state === "success" && lessons.length > 0 && (
                <ul className="lessons">
                    {lessons.map((lesson, index) => {
                        const main = lesson.curricula?.[0]
                        const rooms = formatLessonRooms(lesson)
                        const { timeLabel, isNow, isPast } = getLessonTiming(lesson, now, weekType)
                        const status = isNow ? "lesson--now" : isPast ? "lesson--past" : ""

                        return (
                            <li className={`lesson ${status}`.trim()} key={`${lesson.id ?? "lesson"}:${index}`}>
                                <div className="lesson__top">
                                    <span className="lesson__time">{timeLabel}</span>
                                    {(lesson.type === "upper" || lesson.type === "lower") && (
                                        <span className="today__week-badge">
                                            {lesson.type === "upper" ? "Верхняя неделя" : "Нижняя неделя"}
                                        </span>
                                    )}
                                    {isNow && <span className="nowtag">сейчас</span>}
                                </div>
                                <div className="lesson__bot">
                                    <span className="lesson__name">{main?.subjectabbr || main?.subjectname || "Пара"}</span>
                                    {rooms && <span className="lesson__room">{rooms}</span>}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
