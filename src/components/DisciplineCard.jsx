import React from "react"
import { formatDisciplinePoints, formatDisciplineType, formatTeacherShortName, getGradePresentation, getIndexTeachersForDiscipline } from "../utils/formatters"

export default function DisciplineCard({ discipline, mark, active, index, teachersMap, onClick }) {
    const id = String(discipline.ID)
    const grade = getGradePresentation(mark, discipline)
    const teachers = getIndexTeachersForDiscipline(teachersMap, id)
    const teachersPreview = teachers.slice(0, 2).map((teacher) => formatTeacherShortName(teacher)).join(" · ")
    const teachersOverflow = teachers.length > 2 ? ` +${teachers.length - 2}` : ""
    const points = formatDisciplinePoints(discipline)
    const hasPoints = points !== "—"
    const type = formatDisciplineType(discipline.Type)
    const meta = [type, teachersPreview ? `${teachersPreview}${teachersOverflow}` : ""].filter(Boolean).join(" · ")

    return (
        <button
            className={`row ${active ? "row--active" : ""}`.trim()}
            data-id={id}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={onClick}
        >
            <span className="row__num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="row__main">
                <span className="row__title">{discipline.SubjectName || "Без названия"}</span>
                <span className="row__meta" title={meta}>{meta || "Тип не указан"}</span>
            </span>
            <span className="row__right">
                <span className={`row__pts ${hasPoints ? "" : "row__pts--empty"}`.trim()}>{points}</span>
                <span className={`badge badge--${grade.tone}`}>{grade.text}</span>
            </span>
        </button>
    )
}
