// C# backend on Render (branch csharp-backend, folder backend/).
// Previously these paths were relative: dev went through the vite proxy to
// localhost:3000, production to the Vercel serverless functions in api/.
const API_BASE = "https://brs-test.onrender.com"

export const ENDPOINTS = {
    semesters: `${API_BASE}/api/student/semester_list`,
    index: `${API_BASE}/api/student/index`,
    journal: `${API_BASE}/api/student/discipline/journal`,
    subject: `${API_BASE}/api/student/discipline/subject`,
    events: `${API_BASE}/api/student/discipline/events`,
    globalEvents: `${API_BASE}/api/student/events`,
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
        throw new Error(errMessage + details)
    }

    return json
}
