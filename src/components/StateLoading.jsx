import React from "react"

export default function StateLoading() {
    return (
        <div className="state state-loading" aria-busy="true" aria-live="polite">
            <div className="skeleton skeleton-lg"></div>
            <div className="skeleton"></div>
            <div className="skeleton"></div>
        </div>
    )
}
