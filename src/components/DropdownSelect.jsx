import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const CLOSE_MS = 160
const SCROLL_TOLERANCE = 3
const TYPEAHEAD_MS = 700

export default function DropdownSelect({ label, value, options, onChange, disabled = false, placeholder = "Не выбрано" }) {
    const id = useId()
    const buttonRef = useRef(null)
    const menuRef = useRef(null)
    const searchRef = useRef({ text: "", time: 0 })
    const anchorRef = useRef({ top: 0, left: 0 })
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [active, setActive] = useState(0)
    const [position, setPosition] = useState(null)

    const count = options.length
    const selected = options.findIndex(option => String(option.value) === String(value))
    const expanded = open && !disabled && count > 0
    // если options изменились при открытом меню, active не должен выходить за границы
    const current = Math.max(0, Math.min(active, count - 1))
    const selectedLabel = options[selected]?.label

    const choose = (index) => {
        setOpen(false)
        if (index >= 0 && index < count && index !== selected) onChange(options[index].value)
    }

    const show = () => {
        setActive(Math.max(0, selected))
        searchRef.current = { text: "", time: 0 }
        setOpen(true)
    }

    useEffect(() => {
        if (disabled) setOpen(false)
    }, [disabled])

    // позиционирование и закрытие по клику снаружи / реальному скроллу
    useLayoutEffect(() => {
        if (!expanded) return
        setMounted(true)
        const place = () => {
            const rect = buttonRef.current.getBoundingClientRect()
            anchorRef.current = { top: rect.top, left: rect.left }
            const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24)
            const below = window.innerHeight - rect.bottom - 20
            const above = rect.top - 20
            const upwards = below < 180 && above > below
            setPosition({
                left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
                width,
                maxHeight: Math.max(40, Math.min(320, upwards ? above : below)),
                "--menu-offset": upwards ? "12px" : "-12px",
                ...(upwards ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 })
            })
        }
        const onScroll = event => {
            if (menuRef.current?.contains(event.target)) return
            // игнорируем микро-сдвиги (инерция, адресная строка на мобилках)
            const rect = buttonRef.current.getBoundingClientRect()
            const moved = Math.abs(rect.top - anchorRef.current.top) > SCROLL_TOLERANCE || Math.abs(rect.left - anchorRef.current.left) > SCROLL_TOLERANCE
            if (moved) setOpen(false)
        }
        const onOutside = event => {
            if (!buttonRef.current.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
        }
        place()
        const observer = new ResizeObserver(place)
        observer.observe(buttonRef.current)
        window.addEventListener("resize", place)
        window.addEventListener("scroll", onScroll, true)
        document.addEventListener("pointerdown", onOutside)
        return () => {
            observer.disconnect()
            window.removeEventListener("resize", place)
            window.removeEventListener("scroll", onScroll, true)
            document.removeEventListener("pointerdown", onOutside)
        }
    }, [expanded])

    // размонтируем меню после анимации закрытия
    useEffect(() => {
        if (expanded || !mounted) return
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const timer = setTimeout(() => {
            setMounted(false)
            setPosition(null)
        }, reduce ? 0 : CLOSE_MS)
        return () => clearTimeout(timer)
    }, [expanded, mounted])

    // держим подсвеченный пункт в зоне видимости
    useLayoutEffect(() => {
        const menu = menuRef.current
        const option = menu?.children[current]
        if (!expanded || !position || !option) return
        const top = option.offsetTop
        const bottom = top + option.offsetHeight
        if (top < menu.scrollTop) menu.scrollTop = top
        else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight
    }, [current, expanded, position])

    const handleKeyDown = event => {
        const key = event.key
        const searching = searchRef.current.text && Date.now() - searchRef.current.time < TYPEAHEAD_MS

        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
            event.preventDefault()
            if (!expanded) show()
            const next = key === "Home" ? 0
                : key === "End" ? count - 1
                    : !expanded ? Math.max(0, selected)
                        : Math.max(0, Math.min(count - 1, current + (key === "ArrowDown" ? 1 : -1)))
            setActive(next)
        } else if ((key === "Enter" || key === " ") && !(key === " " && searching)) {
            event.preventDefault()
            if (expanded) choose(current)
            else show()
        } else if (key === "Escape") {
            if (expanded) {
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
            }
        } else if (key === "Tab") {
            setOpen(false)
        } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now()
            const text = (searching ? searchRef.current.text : "") + key.toLocaleLowerCase("ru")
            searchRef.current = { text, time: now }
            const repeated = [...text].every(char => char === text[0])
            const query = repeated ? text[0] : text
            // в закрытом состоянии отталкиваемся от выбранного пункта, в открытом от подсвеченного
            const base = expanded ? current : Math.max(0, selected)
            // одна буква (или повтор одной буквы) листает совпадения по кругу, строка из разных букв уточняет поиск
            const start = repeated ? base + 1 : base
            const offset = options.findIndex((_, i) => options[(start + i) % count].label.toLocaleLowerCase("ru").startsWith(query))
            if (offset >= 0) {
                event.preventDefault()
                if (!expanded) setOpen(true)
                setActive((start + offset) % count)
            }
        }
    }

    const visible = (expanded || mounted) && position

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className="select dropdown-select"
                role="combobox"
                aria-label={selectedLabel ? `${label}: ${selectedLabel}` : label}
                aria-haspopup="listbox"
                aria-expanded={expanded}
                aria-controls={visible ? id : undefined}
                aria-activedescendant={expanded ? `${id}-${current}` : undefined}
                disabled={disabled || !count}
                onClick={() => expanded ? setOpen(false) : show()}
                onKeyDown={handleKeyDown}
                onBlur={() => setOpen(false)}
            >
                <span className="dropdown-select__value">{selectedLabel || placeholder}</span>
                <svg className="dropdown-select__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {visible && createPortal(
                <div
                    ref={menuRef}
                    className="select-menu"
                    id={id}
                    role="listbox"
                    aria-label={label}
                    aria-hidden={!expanded}
                    data-state={expanded ? "open" : "closed"}
                    style={position}
                    // не даём кнопке терять фокус, в том числе при клике по полосе прокрутки
                    onMouseDown={event => event.preventDefault()}
                >
                    {options.map((option, index) => (
                        <div
                            key={String(option.value)}
                            id={`${id}-${index}`}
                            className={`select-option ${current === index ? "select-option--focused" : ""}`}
                            role="option"
                            aria-selected={selected === index}
                            onPointerMove={event => { if (event.pointerType === "mouse") setActive(index) }}
                            onClick={() => choose(index)}
                        >
                            <span>{option.label}</span>
                            {selected === index && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>}
                        </div>
                    ))}
                </div>, document.body
            )}
        </>
    )
}