import React from "react"

export default function StateError({ title, details, onRetry }) {
    return (
        <div className="state state-error" role="alert">
            <h4>{title}</h4>
            <p>{details}</p>
            {onRetry && <button className="btn btn--light btn--sm state-retry" type="button" onClick={onRetry}>Повторить</button>}
        </div>
    )
}
