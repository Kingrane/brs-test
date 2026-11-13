const CACHE_PREFIX = "brs_cache_v1"
const RECORDBOOK_PREFIX = "brs_recordbook_v1"
const EVENTS_PREFIX = "brs_events_v1"
export const EVENTS_TTL_MS = 10 * 60 * 1000
const memoryCache = new Map()
const memoryEvents = new Map()

export function getStoredAuth() {
    return {
        token: localStorage.getItem("grade_token") || "",
        remember: localStorage.getItem("grade_remember") === "1"
    }
}

export function setStoredAuth(token, remember) {
    localStorage.setItem("grade_remember", remember ? "1" : "0")
    if (remember) {
        localStorage.setItem("grade_token", token)
    } else {
        localStorage.removeItem("grade_token")
    }
}

export function clearStoredAuth() {
    localStorage.removeItem("grade_token")
    localStorage.removeItem("grade_remember")
}

export function isLikelyToken(token) {
    return /^[0-9a-z-]{16,80}$/i.test((token || "").trim())
}

function hashToken(token) {
    let hash = 5381
    for (let i = 0; i < token.length; i += 1) {
        hash = ((hash << 5) + hash + token.charCodeAt(i)) | 0
    }
    return (hash >>> 0).toString(36)
}

function cacheKey(token) {
    return `${CACHE_PREFIX}:${hashToken(token)}`
}

function readLocalCache(key) {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function readCache(token) {
    if (!token) return null
    const key = cacheKey(token)
    const value = memoryCache.has(key) ? memoryCache.get(key) : readLocalCache(key)
    return value && typeof value === "object" ? value : null
}

export function writeCache(token, patch, persist) {
    if (!token || !patch) return
    const key = cacheKey(token)
    const next = { ...(readCache(token) || {}), ...patch, savedAt: Date.now() }
    memoryCache.set(key, next)
    if (!persist) return
    try {
        localStorage.setItem(key, JSON.stringify(next))
    } catch {
        // Quota or private mode: the in-memory copy still serves this session.
    }
}

export function clearCache() {
    memoryCache.clear()
    try {
        const keys = []
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i)
            if (key && key.startsWith(CACHE_PREFIX)) keys.push(key)
        }
        keys.forEach((key) => localStorage.removeItem(key))
    } catch {
        // Storage unavailable — nothing to clear.
    }
}

/**
 * The events feed needs the numeric record book id, which the token API never
 * returns: it is only known to the site (the "подписаться на ленту" link).
 * It is stable per student, so it is stored once, per token.
 */
export function getStoredRecordbook(token) {
    if (!token) return ""
    try {
        return localStorage.getItem(`${RECORDBOOK_PREFIX}:${hashToken(token)}`) || ""
    } catch {
        return ""
    }
}

export function setStoredRecordbook(token, recordbook) {
    if (!token || !recordbook) return
    try {
        localStorage.setItem(`${RECORDBOOK_PREFIX}:${hashToken(token)}`, String(recordbook))
    } catch {
        // Storage unavailable — the id still lives in React state for this session.
    }
}

export function clearStoredRecordbook(token) {
    if (!token) return
    try {
        localStorage.removeItem(`${RECORDBOOK_PREFIX}:${hashToken(token)}`)
    } catch {
        // Nothing to clear.
    }
}

/**
 * Accepts the whole feed link or a bare numeric id and returns the id.
 */
export function parseRecordbookInput(input) {
    const value = String(input || "").trim()
    if (!value) return ""
    if (/^\d{4,12}$/.test(value)) return value
    const match = value.match(/[?&#]recordbook=(\d{4,12})/i)
    return match ? match[1] : ""
}

/**
 * 10-minute cache: opening the section again must not hit the upstream again.
 */
export function readEventsCache(token, recordbook) {
    if (!token || !recordbook) return null
    const key = `${EVENTS_PREFIX}:${hashToken(token)}:${recordbook}`
    if (memoryEvents.has(key)) {
        const cached = memoryEvents.get(key)
        if (Date.now() - cached.savedAt < EVENTS_TTL_MS) return cached
        memoryEvents.delete(key)
    }
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || !Array.isArray(parsed.items) || Date.now() - parsed.savedAt >= EVENTS_TTL_MS) return null
        memoryEvents.set(key, parsed)
        return parsed
    } catch {
        return null
    }
}

export function writeEventsCache(token, recordbook, items) {
    if (!token || !recordbook || !Array.isArray(items)) return
    const key = `${EVENTS_PREFIX}:${hashToken(token)}:${recordbook}`
    const payload = { savedAt: Date.now(), items }
    memoryEvents.set(key, payload)
    try {
        localStorage.setItem(key, JSON.stringify(payload))
    } catch {
        // Quota or private mode: the in-memory copy still serves this session.
    }
}

export function clearEventsCache(token, recordbook) {
    if (!token) return
    const suffix = recordbook ? `:${recordbook}` : ""
    const prefix = `${EVENTS_PREFIX}:${hashToken(token)}`
    try {
        const keys = []
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i)
            if (key && key.startsWith(prefix) && (!suffix || key.endsWith(suffix))) keys.push(key)
        }
        keys.forEach((key) => localStorage.removeItem(key))
    } catch {
        // Storage unavailable.
    }
    Array.from(memoryEvents.keys())
        .filter((key) => key.startsWith(prefix) && (!suffix || key.endsWith(suffix)))
        .forEach((key) => memoryEvents.delete(key))
}
