import React, { useState } from "react"

export default function EventsFeedSetup({ onSave }) {
    const [value, setValue] = useState("")
    const [error, setError] = useState("")

    const submit = (raw) => {
        if (!onSave(raw)) {
            setError("В ссылке нет recordbook. Скопируйте ссылку кнопкой «подписаться на ленту» или вставьте число.")
            return false
        }
        setError("")
        return true
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setValue(text.trim())
            submit(text.trim())
        } catch {
            setError("Браузер не дал доступ к буферу обмена. Вставьте ссылку в поле вручную.")
        }
    }

    return (
        <div className="events-setup">
            <p className="kicker">Одна настройка</p>
            <h3 className="events-setup-title">Лента событий в API ЮФУ спрятана за ID зачётки</h3>
            <p className="events-setup-text">
                Токена хватает для оценок и журнала, но история событий принимает только числовой{" "}
                <code>recordbook</code>. Через API ЮФУ его не получить — этот ID знает лишь сам сайт БРС.
                Один раз дайте приложению вашу личную ссылку на ленту, дальше всё работает как обычно.
            </p>
            <ol className="events-setup-steps">
                <li>
                    Откройте{" "}
                    <a href="https://grade.sfedu.ru/student/history" target="_blank" rel="noreferrer noopener">
                        grade.sfedu.ru/student/history
                    </a>{" "}
                    — вы уже под своим аккаунтом.
                </li>
                <li>Нажмите «подписаться на ленту»: сайт скопирует ссылку в буфер обмена.</li>
                <li>Вернитесь сюда и нажмите «Вставить из буфера».</li>
            </ol>
            <div className="events-setup-form">
                <input
                    className="input"
                    type="text"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="https://grade.sfedu.ru/api/v0/events?token=…&recordbook=…"
                    aria-label="Ссылка на ленту событий"
                    spellCheck="false"
                />
                <div className="events-setup-actions">
                    <button className="btn btn--dark" type="button" onClick={handlePaste}>
                        Вставить из буфера
                    </button>
                    <button className="btn btn--light" type="button" onClick={() => submit(value)} disabled={!value.trim()}>
                        Сохранить
                    </button>
                </div>
            </div>
            {error ? <p className="events-setup-error" role="alert">{error}</p> : null}
            <p className="events-setup-hint">
                Ссылка хранится только в этом браузере. Запрос идёт через наш прокси к grade.sfedu.ru
                и не записывается в логи.
            </p>
        </div>
    )
}
