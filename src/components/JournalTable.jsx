import React from "react"

export default function JournalTable({ journal }) {
    if (!journal || !journal.length) {
        return null
    }

    return (
        <div className="table-wrap" role="region" aria-label="Журнал занятий. Таблица с горизонтальной прокруткой" tabIndex="0">
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Тип</th>
                        <th>Тема</th>
                        <th>Баллы</th>
                        <th>Посещение</th>
                    </tr>
                </thead>
                <tbody>
                    {journal.map((entry, idx) => {
                        const date = entry.LessonDate ? new Date(entry.LessonDate).toLocaleDateString("ru-RU") : "-"
                        const mark = entry.Mark ?? "-"
                        const attendedText = entry.Attended ? "Да" : "Нет"
                        const attendedClass = entry.Attended ? "attended" : "missed"

                        return (
                            <tr key={`${idx}-${entry.ID || date}`}>
                                <td>{date}</td>
                                <td>{entry.LessonType || "-"}</td>
                                <td>{entry.Topic || "-"}</td>
                                <td className="mono">{mark}</td>
                                <td className={attendedClass}>{attendedText}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
