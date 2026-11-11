const CACHE_PREFIX = "brs_cache_v1"
const memoryCache = new Map()

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
