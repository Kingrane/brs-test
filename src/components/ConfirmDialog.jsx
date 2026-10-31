import React, { useEffect, useRef } from "react"

export default function ConfirmDialog({ open, title, description, onCancel, onConfirm }) {
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
            onCancel()
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

    return (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
            <div className="dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="logoutDialogTitle" aria-describedby="logoutDialogDescription" onKeyDown={handleKeyDown}>
                <p className="kicker">Подтверждение</p>
                <h2 id="logoutDialogTitle">{title}</h2>
                <p id="logoutDialogDescription">{description}</p>
                <div className="dialog-actions">
                    <button className="btn btn--light" type="button" onClick={onCancel}>Отмена</button>
                    <button className="btn btn--danger" type="button" onClick={onConfirm}>Выйти</button>
                </div>
            </div>
        </div>
    )
}
