import React, { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

export default function AgreementDialog({ open, onClose }) {
    const dialogRef = useRef(null)

    useEffect(() => {
        if (!open) return undefined
        const previousFocus = document.activeElement
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        dialogRef.current?.querySelector("button")?.focus()
        return () => {
            document.body.style.overflow = previousOverflow
            previousFocus?.focus({ preventScroll: true })
        }
    }, [open])

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault()
            onClose()
        }
        if (event.key !== "Tab") return
        const buttons = dialogRef.current.querySelectorAll("button")
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }

    if (!open) return null

    // Портал обязателен: секция истории анимируется transform-ом, и внутри неё
    // `position: fixed` считается от секции, а не от вьюпорта.
    return createPortal(
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div
                className="dialog dialog--wide"
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="agreementDialogTitle"
                aria-describedby="agreementDialogText"
                onKeyDown={handleKeyDown}
            >
                <p className="kicker">Неофициальный клиент</p>
                <h2 id="agreementDialogTitle">Пользовательское соглашение</h2>
                <div id="agreementDialogText" className="dialog-body">
                    <p>
                        Это неофициальное приложение. Оно не связано с ЮФУ и ИТ-лабораторией мехмата, не заменяет
                        grade.sfedu.ru и не выдаёт себя за официальный сервис.
                    </p>
                    <ul>
                        <li>Токен и ID зачётки хранятся только в localStorage вашего браузера. На сервере мы их не сохраняем.</li>
                        <li>Мы не парсим чужие аккаунты и страницы: запросы идут только по вашему токену к вашему аккаунту.</li>
                        <li>Нагрузка минимизирована: история кэшируется на 10 минут и обновляется при открытии раздела или по кнопке «Обновить».</li>
                        <li>Прокси передаёт ответ ЮФУ как есть и не пишет его в логи.</li>
                        <li>Данные могут быть неполными или устаревшими. Официальный источник — grade.sfedu.ru.</li>
                        <li>Вы понимаете, что это неофициальный доступ по личному токену, а автоматизированный доступ может быть ограничен правилами сервиса.</li>
                    </ul>
                    <p>Отозвать доступ: выйти из приложения или удалить токен в личном кабинете БРС.</p>
                </div>
                <div className="dialog-actions">
                    <button className="btn btn--dark" type="button" onClick={onClose}>
                        Понятно
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
