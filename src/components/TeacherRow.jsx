import React from "react"

export default function TeacherRow({ teacher, index }) {
    const fullName = teacher.Name
        || `${teacher.LastName || ""} ${teacher.FirstName || ""} ${teacher.SecondName || ""}`.trim()
        || "Без имени"
    const role = teacher.JobPositionName || "Преподаватель"
    const initials = `${(teacher.LastName || "").slice(0, 1)}${(teacher.FirstName || "").slice(0, 1)}`.toUpperCase()
        || (teacher.Name || "").trim().split(/\s+/).slice(0, 2).map((part) => part.slice(0, 1)).join("").toUpperCase()
        || "—"

    return (
        <article className="teacher-row">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <div>
                <h4>{fullName}</h4>
                <p>{role}</p>
            </div>
        </article>
    )
}
