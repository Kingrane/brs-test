import React, { useLayoutEffect, useRef } from "react"

const ARC_POINTS = Array.from({ length: 25 }, (_, index) => {
    const angle = (-90 + index * 300 / 24) * Math.PI / 180
    return [16 + 13 * Math.cos(angle), 16 + 13 * Math.sin(angle)]
})
const CHECK_POINTS = ARC_POINTS.map((_, index) => index <= 8
    ? [9 + 5 * index / 8, 16 + 5 * index / 8]
    : [14 + 9 * (index - 8) / 16, 21 - 10 * (index - 8) / 16])
const toPath = points => points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(3)} ${y.toFixed(3)}`).join(" ")
const ARC_PATH = toPath(ARC_POINTS)
const CHECK_PATH = toPath(CHECK_POINTS)

export default function StartupIndicator({ success }) {
    const arcRef = useRef(null)

    useLayoutEffect(() => {
        if (!success) return
        const arc = arcRef.current
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
        // Freeze the current rotation before morphing the same stroke into a check.
        const matrix = new DOMMatrixReadOnly(getComputedStyle(arc).transform)
        const from = ARC_POINTS.map(([x, y]) => [16 + matrix.a * (x - 16) + matrix.c * (y - 16), 16 + matrix.b * (x - 16) + matrix.d * (y - 16)])
        arc.style.animation = "none"
        arc.style.transform = "none"
        let frame = 0
        const start = performance.now()
        const finish = () => {
            cancelAnimationFrame(frame)
            arc.setAttribute("d", CHECK_PATH)
        }
        const tick = now => {
            const progress = Math.min(1, (now - start) / 260)
            const eased = 1 - (1 - progress) ** 3
            arc.setAttribute("d", toPath(from.map(([x, y], index) => [x + (CHECK_POINTS[index][0] - x) * eased, y + (CHECK_POINTS[index][1] - y) * eased])))
            if (progress < 1) frame = requestAnimationFrame(tick)
        }
        const onMotionChange = () => { if (motion.matches) finish() }
        if (motion.matches) finish()
        else {
            arc.setAttribute("d", toPath(from))
            frame = requestAnimationFrame(tick)
        }
        motion.addEventListener("change", onMotionChange)
        return () => {
            cancelAnimationFrame(frame)
            motion.removeEventListener("change", onMotionChange)
            arc.removeAttribute("style")
            arc.setAttribute("d", ARC_PATH)
        }
    }, [success])

    return (
        <svg className="startup-loader-spinner" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle className="startup-loader-spinner__ring" cx="16" cy="16" r="14" />
            <path className="startup-loader-spinner__arc" ref={arcRef} d={ARC_PATH} />
        </svg>
    )
}
