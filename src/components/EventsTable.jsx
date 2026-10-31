import React from "react"
import StateEmpty from "./StateEmpty"

export default function EventsTable({ events }) {
    if (!events || !events.length) {
        return <StateEmpty title="История пуста" description="Записей в истории событий не найдено." />
    }

    return (
        <div className="table-wrap" role="region" aria-label="История событий. Таблица с горизонтальной прокруткой" tabIndex="0">
            <table>
                <thead>
                    <tr>
                        <th>Дата и время</th>
                        <th>Событие</th>
                        <th>ФИО преподавателя</th>
                        <th>Дисциплина</th>
                        <th>Значение</th>
                        <th>Раздел</th>
                        <th>Подраздел</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((evt, idx) => (
                        <tr key={evt.id || idx}>
                            <td style={{ whiteSpace: "nowrap" }}>{evt.date}</td>
                            <td><strong>{evt.event}</strong></td>
                            <td>{evt.teacher}</td>
                            <td>{evt.discipline}</td>
                            <td className="mono">{evt.value}</td>
                            <td>{evt.section}</td>
                            <td>{evt.subsection}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
