import React from "react"
import { shortenFullName } from "../utils/schedule"

export default function ScheduleLessonCard({ lesson, pairNum }) {
    const main = lesson.curricula?.[0]
    const uniqueRooms = [...new Set((lesson.curricula || []).map((c) => c.roomname).filter(Boolean))]
    const subjectName = main?.subjectabbr || main?.subjectname || "Неизвестно"
    const subjectFull = main?.subjectname || ""

    return (
        <article className={`sched-lesson ${lesson.isLecture ? "sched-lesson-lecture" : ""}`}>
            <div className="sched-lesson-head">
                <span className="sched-lesson-time">
                    {pairNum && <span className="sched-pair-num">{pairNum}</span>}
                    {lesson.start}–{lesson.end}
                </span>
                {lesson.type !== "full" && (
                    <span className={`sched-badge ${lesson.type === "upper" ? "sched-badge-upper" : "sched-badge-lower"}`}>
                        {lesson.typeLabel}
                    </span>
                )}
            </div>

            <h4 className="sched-subject">{subjectName}</h4>
            {subjectFull && subjectFull !== subjectName && <p className="sched-subject-full">{subjectFull}</p>}

            {main?.teachername && (
                <p className="sched-teacher">{shortenFullName(main.teachername)}</p>
            )}

            <div className="sched-lesson-foot">
                {uniqueRooms.length > 0 && <span className="sched-room">{uniqueRooms.join(" · ")}</span>}
                {lesson.hasSubgroups && <span className="sched-subgroup">подгруппы</span>}
                {lesson.isLecture && <span className="sched-tag">Лекция</span>}
            </div>

            {lesson.info && <p className="sched-info">{lesson.info}</p>}
        </article>
    )
}
