export const ENDPOINTS = {
    semesters: "/api/student/semester_list",
    index: "/api/student/index",
    journal: "/api/student/discipline/journal",
    subject: "/api/student/discipline/subject",
    events: "/api/student/discipline/events",
    globalEvents: "/api/student/events",
}

export function buildQuery(params) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            qs.set(key, String(value))
        }
    }
    return qs.toString()
}

export async function apiGet(url) {
    const res = await fetch(url)
    const text = await res.text()
    let json = null
    try {
        json = JSON.parse(text)
    } catch {
        json = null
    }

    return { res, text, json }
}

export async function fetchJson(endpoint, params = {}, onDebug) {
    const query = buildQuery(params)
    const url = query ? `${endpoint}?${query}` : endpoint
    const { res, text, json } = await apiGet(url)

    if (onDebug) {
        onDebug(url, json || text)
    }

    if (!res.ok) {
        const errMessage = json?.error || json?.message || `HTTP ${res.status}`
        const details = json?.details ? ` (${json.details})` : ""
        const error = new Error(errMessage + details)
        error.status = res.status
        throw error
    }

    return json
}
