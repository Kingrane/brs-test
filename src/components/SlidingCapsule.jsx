import React, { useCallback, useLayoutEffect, useRef } from "react"

export default function SlidingCapsule({ as: Tag = "div", activeKey, className = "", children, ...props }) {
    const rootRef = useRef(null)
    const indicatorRef = useRef(null)
    const targetRef = useRef(null)
    const animationRef = useRef(null)

    const move = useCallback((animate = false) => {
        const root = rootRef.current
        const indicator = indicatorRef.current
        const selected = root?.querySelector('button[aria-selected="true"], button[aria-pressed="true"], button[aria-current]')
        if (!selected || !selected.offsetWidth) return
        const target = { x: selected.offsetLeft, y: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight }
        const previous = targetRef.current
        if (previous && Object.keys(target).every(key => target[key] === previous[key])) return

        const currentRect = indicator.getBoundingClientRect()
        const rootRect = root.getBoundingClientRect()
        animationRef.current?.cancel()
        indicator.style.width = `${target.width}px`
        indicator.style.height = `${target.height}px`
        indicator.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`
        root.dataset.ready = "true"
        targetRef.current = target

        if (animate && previous && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const x = currentRect.left - rootRect.left + root.scrollLeft
            const y = currentRect.top - rootRect.top + root.scrollTop
            animationRef.current = indicator.animate([
                { transform: `translate3d(${x}px, ${y}px, 0) scaleX(${currentRect.width / target.width})` },
                { transform: `translate3d(${target.x}px, ${target.y}px, 0) scaleX(1)` }
            ], { duration: 360, easing: "cubic-bezier(0.22, 0.8, 0.25, 1)" })
        }
    }, [])

    useLayoutEffect(() => {
        move(true)
    }, [activeKey, move])

    useLayoutEffect(() => {
        let mounted = true
        const observer = new ResizeObserver(() => move())
        observer.observe(rootRef.current)
        rootRef.current.querySelectorAll("button").forEach(button => observer.observe(button))
        document.fonts.ready.then(() => { if (mounted) move() })
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
        const stopMotion = () => { if (motion.matches) animationRef.current?.cancel() }
        motion.addEventListener("change", stopMotion)
        return () => {
            mounted = false
            observer.disconnect()
            motion.removeEventListener("change", stopMotion)
            animationRef.current?.cancel()
        }
    }, [move])

    return (
        <Tag ref={rootRef} className={`sliding-capsule ${className}`.trim()} {...props}>
            <span ref={indicatorRef} className="capsule-indicator" aria-hidden="true" />
            {children}
        </Tag>
    )
}
