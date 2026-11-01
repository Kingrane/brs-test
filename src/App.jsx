import React, { useEffect, useMemo, useRef, useState } from "react"
import { ENDPOINTS, fetchJson } from "./api/client"
import { getStoredAuth, setStoredAuth, isLikelyToken } from "./utils/storage"
import { getIndexTeachersForDiscipline } from "./utils/formatters"
import LoginView from "./views/LoginView"
import DashboardView from "./views/DashboardView"
import ConfirmDialog from "./components/ConfirmDialog"
import StartupIndicator from "./components/StartupIndicator"

const INITIAL_REQUEST = {
    semesters: "idle",
    index: "idle",
    detail: "idle",
    globalEvents: "idle"
}

export default function App() {
    const [tokenInput, setTokenInput] = useState("")
    const [token, setToken] = useState("")
    const [remember, setRemember] = useState(false)
    const [view, setView] = useState("login")
    const [mainNav, setMainNav] = useState("disciplines") // "disciplines" | "events" | "schedule"
    const [loginStatus, setLoginStatus] = useState({ message: "", type: "" })
    const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
    const [authReady, setAuthReady] = useState(false)
    const [startupSuccess, setStartupSuccess] = useState(false)
    const [isLoggingIn, setIsLoggingIn] = useState(false)

    const [semesters, setSemesters] = useState([])
    const [currentSemesterID, setCurrentSemesterID] = useState("")
    const [recordbookID, setRecordbookID] = useState("")
    const [disciplines, setDisciplines] = useState([])
    const [marks, setMarks] = useState({})
    const [teachersMap, setTeachersMap] = useState({})
    const [selectedDisciplineID, setSelectedDisciplineID] = useState("")
    const [globalEventsData, setGlobalEventsData] = useState(null)
    const [debugLog, setDebugLog] = useState({})
    const [request, setRequest] = useState(INITIAL_REQUEST)
    const [lastMainLoadError, setLastMainLoadError] = useState("")
    const [activeTab, setActiveTab] = useState("grade")

    const detailCacheRef = useRef(new Map())
    const detailRequestRef = useRef(0)
    const autoLoginRef = useRef(null)

    const selectedDiscipline = useMemo(
        () => disciplines.find((discipline) => String(discipline.ID) === String(selectedDisciplineID)) || null,
        [disciplines, selectedDisciplineID]
    )

    const detail = useMemo(() => {
        if (!currentSemesterID || !selectedDisciplineID) {
            return { journal: null, subject: null, events: null }
        }
        return detailCacheRef.current.get(`${currentSemesterID}:${selectedDisciplineID}`) || { journal: null, subject: null, events: null }
    }, [currentSemesterID, selectedDisciplineID, request.detail])

    const handleDebugLog = (url, payload) => {
        setDebugLog((prev) => ({ ...prev, [url]: payload }))
    }

    const loadSemesters = async (authToken) => {
        setRequest((prev) => ({ ...prev, semesters: "loading" }))
        const json = await fetchJson(ENDPOINTS.semesters, { token: authToken }, handleDebugLog)
        const response = json?.response || {}
        const list = Array.isArray(response) ? response : Object.values(response)
        list.sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))

        const nextSemester = list[0] ? String(list[0].ID) : ""
        setSemesters(list)
        setCurrentSemesterID(nextSemester)
        setRequest((prev) => ({ ...prev, semesters: "success" }))
        return nextSemester
    }

    const loadGlobalEvents = async (authToken, semesterID, rId) => {
        setRequest((prev) => ({ ...prev, globalEvents: "loading" }))
        try {
            const json = await fetchJson(ENDPOINTS.globalEvents, {
                token: authToken,
                semesterID: semesterID,
                recordbookID: rId || recordbookID
            }, handleDebugLog)
            setGlobalEventsData(json)
            setRequest((prev) => ({ ...prev, globalEvents: "success" }))
        } catch {
            setRequest((prev) => ({ ...prev, globalEvents: "error" }))
        }
    }

    const loadIndex = async (authToken, semesterID) => {
        if (!semesterID) {
            setDisciplines([])
            setMarks({})
            setTeachersMap({})
            setRequest((prev) => ({ ...prev, index: "success" }))
            return ""
        }

        setRequest((prev) => ({ ...prev, index: "loading" }))
        try {
            const json = await fetchJson(ENDPOINTS.index, {
                token: authToken,
                SemesterID: semesterID
            }, handleDebugLog)
            const response = json?.response || {}
            const nextDisciplines = Array.isArray(response.Disciplines) ? response.Disciplines : []
            const rId = response.RecordbookID || response.RecordBook || response.Student?.RecordbookID || response.Student?.RecordBook || response.Student?.ID || ""
            
            setDisciplines(nextDisciplines)
            setMarks(response.Marks || {})
            setTeachersMap(response.Teachers || {})
            setRecordbookID(String(rId))

            setSelectedDisciplineID((prev) => {
                if (!prev) return ""
                const stillExists = nextDisciplines.some((discipline) => String(discipline.ID) === String(prev))
                return stillExists ? prev : ""
            })

            setRequest((prev) => ({ ...prev, index: "success" }))
            setLastMainLoadError("")
            return String(rId)
        } catch (error) {
            setRequest((prev) => ({ ...prev, index: "error" }))
            setLastMainLoadError(error.message)
            throw error
        }
    }

    const selectDiscipline = async (disciplineID, options = {}) => {
        const nextID = String(disciplineID)
        const requestID = ++detailRequestRef.current
        setSelectedDisciplineID(nextID)

        const cacheKey = `${currentSemesterID}:${nextID}`
        const cachedDetail = detailCacheRef.current.get(cacheKey)
        if (!options.forceReload && cachedDetail?.journal && cachedDetail?.subject) {
            setRequest((prev) => ({ ...prev, detail: "success" }))
            return
        }

        setRequest((prev) => ({ ...prev, detail: "loading" }))

        try {
            const [journalResult, subjectResult, eventsResult] = await Promise.all([
                fetchJson(ENDPOINTS.journal, { token, id: nextID }, handleDebugLog).catch(() => null),
                fetchJson(ENDPOINTS.subject, { token, id: nextID }, handleDebugLog).catch(() => null),
                fetchJson(ENDPOINTS.events, { token, id: nextID, semesterID: currentSemesterID, recordbookID }, handleDebugLog).catch(() => null)
            ])

            if (requestID !== detailRequestRef.current) return
            if (!journalResult && !subjectResult) {
                detailCacheRef.current.delete(cacheKey)
                setRequest((prev) => ({ ...prev, detail: "error" }))
                return
            }

            detailCacheRef.current.set(cacheKey, {
                journal: journalResult,
                subject: subjectResult,
                events: eventsResult
            })
            setRequest((prev) => ({ ...prev, detail: "success" }))
        } catch {
            if (requestID === detailRequestRef.current) setRequest((prev) => ({ ...prev, detail: "error" }))
        }
    }

    const loadDashboardData = async (authToken) => {
        setLastMainLoadError("")
        const semesterID = await loadSemesters(authToken)
        const rId = await loadIndex(authToken, semesterID)
        await loadGlobalEvents(authToken, semesterID, rId)
    }

    const runLogin = async (authToken, rememberFlag, isAuto = false) => {
        setIsLoggingIn(true)
        setToken(authToken)
        setRemember(rememberFlag)
        if (!isAuto) {
            setLoginStatus({ message: "Проверка токена...", type: "" })
        }

        try {
            await loadDashboardData(authToken)
            setStoredAuth(authToken, rememberFlag)
            setView("dashboard")
            setLoginStatus({ message: "", type: "" })
            return true
        } catch (error) {
            setRequest((prev) => ({ ...prev, semesters: prev.semesters === "loading" ? "error" : prev.semesters }))
            if (isAuto) {
                setView("login")
                setLoginStatus({ message: "Не удалось автоматически войти. Проверьте токен.", type: "error" })
                return false
            }
            setLoginStatus({ message: `Ошибка входа: ${error.message}`, type: "error" })
            return false
        } finally {
            setIsLoggingIn(false)
        }
    }

    const handleLogin = async () => {
        if (isLoggingIn) return
        const authToken = tokenInput.trim()
        if (!isLikelyToken(authToken)) {
            setLoginStatus({ message: "Введите валидный токен (обычно 36-40 символов).", type: "error" })
            return
        }

        await runLogin(authToken, remember)
    }

    const handleLogout = () => {
        setConfirmLogoutOpen(true)
    }

    const confirmLogout = () => {
        detailRequestRef.current += 1
        const storedAuth = getStoredAuth()
        setConfirmLogoutOpen(false)
        setTokenInput(storedAuth.token || tokenInput)
        setToken("")
        setRemember(Boolean(storedAuth.token && storedAuth.remember))
        setSemesters([])
        setCurrentSemesterID("")
        setRecordbookID("")
        setDisciplines([])
        setMarks({})
        setTeachersMap({})
        setSelectedDisciplineID("")
        setGlobalEventsData(null)
        setDebugLog({})
        detailCacheRef.current.clear()
        setRequest(INITIAL_REQUEST)
        setLastMainLoadError("")
        setActiveTab("grade")
        setMainNav("disciplines")
        setLoginStatus({ message: "", type: "" })
        setView("login")
    }

    const handleRefresh = async () => {
        try {
            const rId = await loadIndex(token, currentSemesterID)
            await loadGlobalEvents(token, currentSemesterID, rId)
            if (selectedDisciplineID) {
                await selectDiscipline(selectedDisciplineID, { forceReload: true })
            }
        } catch {
            return
        }
    }

    const handleSemesterChange = async (event) => {
        detailRequestRef.current += 1
        setRequest((prev) => ({ ...prev, detail: "idle" }))
        const semesterID = event.target.value
        setCurrentSemesterID(semesterID)
        setSelectedDisciplineID("")
        try {
            const rId = await loadIndex(token, semesterID)
            await loadGlobalEvents(token, semesterID, rId)
        } catch {
            return
        }
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setTokenInput(text.trim())
        } catch {
            setLoginStatus({ message: "Браузер не дал доступ к буферу обмена.", type: "error" })
        }
    }

    useEffect(() => {
        let cancelled = false
        const storedAuth = getStoredAuth()
        if (!storedAuth.token) {
            setAuthReady(true)
            return
        }

        setTokenInput(storedAuth.token)
        setRemember(storedAuth.remember)
        if (storedAuth.remember) {
            setLoginStatus({ message: "Выполняется автоматический вход...", type: "" })
            if (!autoLoginRef.current) autoLoginRef.current = runLogin(storedAuth.token, true, true)
            autoLoginRef.current.then(success => {
                if (cancelled) return
                if (success) setStartupSuccess(true)
                else setAuthReady(true)
            })
        } else {
            setAuthReady(true)
        }
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!startupSuccess) return
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 420
        const timer = window.setTimeout(() => setAuthReady(true), delay)
        return () => window.clearTimeout(timer)
    }, [startupSuccess])

    const mergedTeachers = useMemo(() => {
        if (!selectedDiscipline) return []
        const fromJournal = Array.isArray(detail.journal?.response?.Teachers) ? detail.journal.response.Teachers : []
        const fromSubject = Array.isArray(detail.subject?.response?.Teachers) ? detail.subject.response.Teachers : []
        const fromIndex = getIndexTeachersForDiscipline(teachersMap, selectedDiscipline.ID)
        const merged = [...fromJournal, ...fromSubject, ...fromIndex]
        const uniq = []
        const seen = new Set()

        for (const teacher of merged) {
            const key = String(teacher.ID || teacher.TeacherID || teacher.Name || `${teacher.LastName}-${teacher.FirstName}`)
            if (!seen.has(key)) {
                seen.add(key)
                uniq.push(teacher)
            }
        }

        return uniq
    }, [detail, selectedDiscipline, teachersMap])

    if (!authReady) {
        return (
            <main className={`startup-loader ${startupSuccess ? "startup-loader--success" : ""}`.trim()} aria-live="polite" aria-busy={!startupSuccess}>
                <img className="startup-loader-logo" src="/sfedu.svg" alt="Южный федеральный университет" />
                <StartupIndicator success={startupSuccess} />
                <p>{startupSuccess ? "Вы вошли" : "Выполняется вход..."}</p>
                <small>{startupSuccess ? "Всё готово" : "Проверяем сохранённый токен"}</small>
            </main>
        )
    }

    return (
        <div>
            <LoginView
                active={view === "login" && authReady}
                tokenInput={tokenInput}
                setTokenInput={setTokenInput}
                remember={remember}
                setRemember={setRemember}
                loginStatus={loginStatus}
                handleLogin={handleLogin}
                handlePaste={handlePaste}
                busy={isLoggingIn}
            />

            <ConfirmDialog
                open={confirmLogoutOpen}
                title="Выйти из аккаунта?"
                description="Вы вернётесь на экран входа. Сохранённый токен останется в поле ввода."
                onCancel={() => setConfirmLogoutOpen(false)}
                onConfirm={confirmLogout}
            />

            <DashboardView
                active={view === "dashboard"}
                mainNav={mainNav}
                setMainNav={setMainNav}
                token={token}
                semesters={semesters}
                currentSemesterID={currentSemesterID}
                handleSemesterChange={handleSemesterChange}
                disciplines={disciplines}
                marks={marks}
                teachersMap={teachersMap}
                selectedDisciplineID={selectedDisciplineID}
                selectedDiscipline={selectedDiscipline}
                selectDiscipline={selectDiscipline}
                detail={detail}
                globalEventsData={globalEventsData}
                request={request}
                lastMainLoadError={lastMainLoadError}
                loadIndex={loadIndex}
                loadGlobalEvents={loadGlobalEvents}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mergedTeachers={mergedTeachers}
                debugLog={debugLog}
                handleRefresh={handleRefresh}
                handleLogout={handleLogout}
            />
        </div>
    )
}
