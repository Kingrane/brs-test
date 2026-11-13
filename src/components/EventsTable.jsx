import React from "react"
import StateEmpty from "./StateEmpty"

function hasValue(value) {
    const text = String(value ?? "").trim()
    return Boolean(text) && text !== "-"
}

export default function EventsTable({ events }) {
    if (!events || !events.length) {
        return <StateEmpty title="История пуста" description="Записей в истории событий не найдено." />
    }

    return (
        <>
            <div className="table-wrap events-table-wrap" role="region" aria-label="История событий. Таблица с горизонтальной прокруткой" tabIndex="0">
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

            <ul className="events-cards">
                {events.map((evt, idx) => {
                    const meta = [evt.teacher, evt.section, evt.subsection].filter(hasValue).join(" · ")
                    return (
                        <li className="event-card" key={evt.id || idx}>
                            <div className="event-card__head">
                                <strong className="event-card__event">{evt.event}</strong>
                                {hasValue(evt.value) ? <span className="event-card__value mono">{evt.value}</span> : null}
                            </div>
                            {hasValue(evt.discipline) ? <p className="event-card__discipline">{evt.discipline}</p> : null}
                            {meta ? <p className="event-card__meta">{meta}</p> : null}
                            <p className="event-card__date mono">{evt.date}</p>
                        </li>
                    )
                })}
            </ul>
        </>
    )
}
