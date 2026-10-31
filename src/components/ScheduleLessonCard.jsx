import React from "react"
import { formatScheduleRoom } from "../utils/schedule"

export default function ScheduleLessonCard({ lesson, compact = false, showTime = true }) {
    const curricula = lesson.curricula || []
    const subjects = new Map()
    for (const curriculum of curricula) {
        const name = curriculum.subjectname || curriculum.subjectabbr || "Предмет не указан"
        if (!subjects.has(name)) subjects.set(name, [])
        subjects.get(name).push(curriculum)
    }
    if (!subjects.size) subjects.set("Предмет не указан", [])
    const singleRoom = curricula.length === 1 ? formatScheduleRoom(curricula[0].roomname) : ""

    return (
        <article className={`sched-lesson ${compact ? "sched-lesson--compact" : ""}`} data-lesson-id={lesson.id}>
            {showTime && (
                <div className="sched-lesson-time">
                    <span className="sched-time-dot" aria-hidden="true" />
                    {lesson.start} – {lesson.end}
                </div>
            )}
            <div className="sched-lesson-meta">
                {(lesson.type === "upper" || lesson.type === "lower") && (
                    <span className={`sched-badge sched-badge-${lesson.type}`}>
                        {lesson.type === "upper" ? "↑ Верхняя неделя" : "↓ Нижняя неделя"}
                    </span>
                )}
                {lesson.isLecture && <span className="sched-tag" title="Лекция">лек.</span>}
                {singleRoom && <span className="sched-room">{singleRoom}</span>}
            </div>
            {lesson.info && <p className="sched-info">{lesson.info}</p>}
            {[...subjects.entries()].map(([name, entries]) => (
                <div className="sched-subject-group" key={name}>
                    <h4 className="sched-subject">{name}</h4>
                    <div className={entries.length > 1 ? "sched-subgroups" : "sched-teaching"}>
                        {entries.map((entry, index) => (
                            <div className="sched-teaching-entry" key={entry.id ?? index}>
                                {lesson.hasSubgroups && entry.subnum != null && <span className="sched-subgroup">{entry.subnum} подгр.</span>}
                                {entry.teachername && <p className="sched-teacher">{entry.teachername}</p>}
                                {!singleRoom && entry.roomname && <span className="sched-room">{formatScheduleRoom(entry.roomname)}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </article>
    )
}
