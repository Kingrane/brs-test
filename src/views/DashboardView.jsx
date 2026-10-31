import React from "react"
import StateLoading from "../components/StateLoading"
import StateEmpty from "../components/StateEmpty"
import StateError from "../components/StateError"
import DisciplineCard from "../components/DisciplineCard"
import TeacherRow from "../components/TeacherRow"
import JournalTable from "../components/JournalTable"
import EventsTable from "../components/EventsTable"
import ModuleCardList from "../components/ModuleCardList"
import ScheduleView from "../components/ScheduleView"
import TodayCard from "../components/TodayCard"
import SlidingCapsule from "../components/SlidingCapsule"
import { formatDisciplinePoints, formatDisciplineType, formatSemesterLabel, getGradePresentation, parseEventsData } from "../utils/formatters"

const MAIN_NAV = [
    { id: "disciplines", label: "Дисциплины" },
    { id: "schedule", label: "Расписание" },
    { id: "events", label: "История событий", mobileLabel: "События" }
]

const DISCIPLINE_TABS = [
    { id: "grade", label: "Оценка" },
    { id: "journal", label: "Журнал" },
    { id: "map", label: "Модули" },
    { id: "teachers", label: "Преподаватели" }
]

export default function DashboardView({
    active,
    mainNav,
    setMainNav,
    token,
    semesters,
    currentSemesterID,
    handleSemesterChange,
    disciplines,
    marks,
    teachersMap,
    selectedDisciplineID,
    selectedDiscipline,
    selectDiscipline,
    detail,
    globalEventsData,
    request,
    lastMainLoadError,
    loadIndex,
    loadGlobalEvents,
    activeTab,
    setActiveTab,
    mergedTeachers,
    debugLog,
    handleRefresh,
    handleLogout
}) {
    const [mobileView, setMobileView] = React.useState("list")

    React.useEffect(() => {
        setMobileView("list")
    }, [currentSemesterID, mainNav])

    React.useEffect(() => {
        if (!selectedDisciplineID) {
            setMobileView("list")
        }
    }, [selectedDisciplineID])

    const handleDisciplineClick = (id) => {
        selectDiscipline(id)
        setMobileView("detail")
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
            requestAnimationFrame(() => document.querySelector(".mobile-back-btn")?.focus({ preventScroll: true }))
        }
    }

    const handleBackToList = () => {
        setMobileView("list")
        requestAnimationFrame(() => document.querySelector(`.row[data-id="${selectedDisciplineID}"]`)?.focus({ preventScroll: true }))
    }

    const retryDetail = () => selectDiscipline(selectedDisciplineID, { forceReload: true })
    const detailError = () => <StateError title="Не удалось загрузить данные" details="Попробуйте повторить запрос к БРС." onRetry={retryDetail} />

    const handleTabKeyDown = (event, index) => {
        const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
        if (!offset && event.key !== "Home" && event.key !== "End") return
        event.preventDefault()
        const next = event.key === "Home" ? 0 : event.key === "End" ? DISCIPLINE_TABS.length - 1 : (index + offset + DISCIPLINE_TABS.length) % DISCIPLINE_TABS.length
        setActiveTab(DISCIPLINE_TABS[next].id)
        event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
    }

    const selectedMark = selectedDiscipline
        ? marks[String(selectedDiscipline.ID)] || marks[selectedDiscipline.ID] || ""
        : ""
    const selectedGrade = selectedDiscipline ? getGradePresentation(selectedMark, selectedDiscipline) : { text: "-", tone: "muted" }
    const selectedPoints = formatDisciplinePoints(selectedDiscipline)
    const panelSub = selectedDiscipline
        ? `${formatDisciplineType(selectedDiscipline.Type)} · ${selectedPoints}`
        : "Выберите дисциплину в списке"

    const parsedGlobalEvents = parseEventsData(globalEventsData)

    const renderDisciplines = () => {
        if (request.index === "loading") {
            return <StateLoading />
        }

        if (request.index === "error") {
            return <StateError title="Не удалось загрузить дисциплины" details={lastMainLoadError} onRetry={() => loadIndex(token, currentSemesterID).catch(() => {})} />
        }

        if (!disciplines.length) {
            return <StateEmpty title="Нет дисциплин" description="В выбранном семестре не найдено дисциплин." />
        }

        return disciplines.map((discipline, index) => {
            const id = String(discipline.ID)
            const mark = marks[id] || marks[discipline.ID] || ""
            const isActive = selectedDisciplineID === id

            return (
                <DisciplineCard
                    key={id}
                    discipline={discipline}
                    mark={mark}
                    active={isActive}
                    index={index}
                    teachersMap={teachersMap}
                    onClick={() => handleDisciplineClick(id)}
                />
            )
        })
    }

    const renderGradeTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Выберите дисциплину" description="Откройте дисциплину в списке слева." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        if (request.detail === "error") {
            return (
                <StateError
                    title="Не удалось загрузить детали"
                    details="Сервер вернул ошибку при запросе конкретной дисциплины."
                    onRetry={() => selectDiscipline(selectedDisciplineID, { forceReload: true })}
                />
            )
        }

        const markRaw = marks[String(selectedDiscipline.ID)] || marks[selectedDiscipline.ID] || ""
        const grade = getGradePresentation(markRaw, selectedDiscipline)
        const subject = detail.subject?.response?.Discipline || detail.journal?.response?.Discipline || selectedDiscipline
        const disciplineMap = detail.subject?.response?.DisciplineMap
        const submodules = detail.subject?.response?.Submodules || {}

        const isExamType = /exam|difftest|coursework/i.test(String(subject?.Type || ''))

        const examFromSub = Object.values(submodules).find(sm => {
            const t = (sm.Title || '').trim()
            return t === '' || /экзамен|exam|зачёт|аттестац|итогов/i.test(t)
        })

        const examRate = subject?.ExamRate ?? subject?.Exam?.Rate ?? disciplineMap?.Exam?.Rate ?? disciplineMap?.Final?.Rate ?? examFromSub?.Rate ?? null
        const examMax = subject?.MaxExamRate ?? subject?.Exam?.MaxRate ?? disciplineMap?.Exam?.MaxRate ?? disciplineMap?.Final?.MaxRate ?? examFromSub?.MaxRate ?? null

        const rateValue = Number(subject?.Rate ?? selectedDiscipline?.Rate)
        const maxValue = Number(subject?.MaxCurrentRate ?? selectedDiscipline?.MaxCurrentRate)
        const percent = Number.isFinite(rateValue) && Number.isFinite(maxValue) && maxValue > 0
            ? Math.max(0, Math.min(100, Math.round((rateValue / maxValue) * 100)))
            : null

        return (
            <div className="grade-panel">
                <div className="grade-hero">
                    <div className={`grade-main grade-${grade.tone}`}>{grade.text}</div>
                    <p className="grade-caption">{grade.description}</p>
                </div>

                {percent !== null && (
                    <div
                        className="bar"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label="Текущий рейтинг по дисциплине"
                    >
                        <span className={`bar__fill bar__fill--${grade.tone}`} style={{ "--progress": percent / 100 }}></span>
                    </div>
                )}

                <dl className="kv-grid">
                    <div><dt>Тип</dt><dd>{formatDisciplineType(subject?.Type)}</dd></div>
                    {isExamType && (
                        <div><dt>Баллы за экзамен</dt><dd>{examRate ?? "-"} / {examMax ?? "-"}</dd></div>
                    )}
                    <div><dt>Баллы</dt><dd>{subject?.Rate ?? selectedDiscipline?.Rate ?? "-"} / {subject?.MaxCurrentRate ?? selectedDiscipline?.MaxCurrentRate ?? "-"}</dd></div>
                </dl>
            </div>
        )
    }

    const renderJournalTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Нет журнала" description="Данные журнала появятся после выбора дисциплины." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        if (request.detail === "error" || (request.detail === "success" && !detail.journal)) return detailError()

        const journal = Array.isArray(detail.journal?.response?.Journal) ? detail.journal.response.Journal : []
        if (!journal.length) {
            return <StateEmpty title="Журнал пуст" description="Для этой дисциплины журнал не вернул записей." />
        }

        return <JournalTable journal={journal} />
    }

    const renderMapTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Нет модулей" description="Данные о модулях появятся после выбора дисциплины." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        if (request.detail === "error" || (request.detail === "success" && !detail.subject)) return detailError()

        const disciplineMap = detail.subject?.response?.DisciplineMap
        const submodules = detail.subject?.response?.Submodules || {}
        if (!disciplineMap?.Modules) {
            return <StateEmpty title="Модули недоступны" description="API не вернул структуру модулей для этой дисциплины." />
        }

        const subjectInfo = detail.subject?.response?.Discipline || detail.journal?.response?.Discipline || selectedDiscipline

        return <ModuleCardList subjectInfo={subjectInfo} disciplineMap={disciplineMap} submodules={submodules} />
    }

    const renderTeachersTab = () => {
        if (!selectedDiscipline) {
            return <StateEmpty title="Нет преподавателей" description="Данные о преподавателях появятся после выбора дисциплины." />
        }

        if (request.detail === "loading") {
            return <StateLoading />
        }

        if (request.detail === "error" && !mergedTeachers.length) return detailError()

        if (!mergedTeachers.length) {
            return <StateEmpty title="Список пуст" description="Преподаватели для выбранной дисциплины не найдены." />
        }

        return (
            <div className="teacher-list">
                {mergedTeachers.map((teacher, idx) => (
                    <TeacherRow key={String(teacher.ID || teacher.TeacherID || idx)} teacher={teacher} index={idx} />
                ))}
            </div>
        )
    }

    return (
        <section className={`view dashboard-view ${active ? "view-active" : ""}`.trim()} aria-label="Панель оценок">
            <header className="topbar">
                <div className="wrap topbar__in">
                    <div className="brand">
                        <span className="brand__top">БРС ЮФУ</span>
                        <span className="brand__name">SuperBRS</span>
                    </div>

                    <div className="topbar__actions">
                        <label className="field field--inline semester-picker">
                            <span>Семестр</span>
                            <select className="input select" value={currentSemesterID} onChange={handleSemesterChange} disabled={request.index === "loading"}>
                                {semesters.length === 0 ? (
                                    <option value="">{request.semesters === "loading" ? "Загрузка..." : "Семестры не найдены"}</option>
                                ) : (
                                    semesters.map((semester) => (
                                        <option key={String(semester.ID)} value={String(semester.ID)}>{formatSemesterLabel(semester)}</option>
                                    ))
                                )}
                            </select>
                        </label>
                        <button className="btn btn--dark" type="button" onClick={handleRefresh} disabled={request.index === "loading" || request.detail === "loading"}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 11a8 8 0 1 0-2.3 5.6"></path>
                                <path d="M20 5v6h-6"></path>
                            </svg>
                            Обновить
                        </button>
                        <button className="btn btn--light logout-button" type="button" onClick={handleLogout} aria-label="Выйти">
                            <span className="action-label">Выйти</span>
                            <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M10 4H5v16h5M9 12h11m-4-4 4 4-4 4" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="wrap navrow">
                <SlidingCapsule as="nav" className="tabs" activeKey={mainNav} aria-label="Основные разделы">
                    {MAIN_NAV.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`tab ${mainNav === item.id ? "tab-active" : ""}`.trim()}
                            aria-current={mainNav === item.id ? "page" : undefined}
                            onClick={() => {
                                setMainNav(item.id)
                                setMobileView("list")
                            }}
                        >
                            <span className={item.mobileLabel ? "nav-label-full" : undefined}>{item.label}</span>
                            {item.mobileLabel && <span className="nav-label-short">{item.mobileLabel}</span>}
                        </button>
                    ))}
                </SlidingCapsule>

            </div>

            {mainNav === "disciplines" ? (
                <main className={`wrap dashboard-grid ${mobileView === "detail" ? "mobile-view-detail" : "mobile-view-list"}`}>
                    <div className="col col--left">
                        <section className="list-section" aria-labelledby="disciplineListTitle">
                            <div className="list__head">
                                <h2 className="list__title" id="disciplineListTitle">Список дисциплин</h2>
                                <span className="badge badge--ember">{String(disciplines.length)}</span>
                            </div>
                            <div className="card list">{renderDisciplines()}</div>
                        </section>

                        <TodayCard active={active} />
                    </div>

                    <div className="col col--right">
                        <article className="discipline-detail">
                            <div className="panel__head">
                                <div className="panel__title-wrap">
                                    <button
                                        type="button"
                                        className="mobile-back-btn"
                                        onClick={handleBackToList}
                                        aria-label="Назад к списку дисциплин"
                                    >
                                        <span className="mobile-back-icon" aria-hidden="true">←</span>
                                        <span>К списку</span>
                                    </button>
                                    <h1 className="panel__title" title={selectedDiscipline?.SubjectName}>
                                        {selectedDiscipline?.SubjectName || "Детали дисциплины"}
                                    </h1>
                                    <p className="panel__sub">{panelSub}</p>
                                </div>
                                <span className={`badge badge--panel badge--${selectedGrade.tone}`}>{selectedGrade.text || "-"}</span>
                            </div>

                            <SlidingCapsule className="seg detail-tabs" activeKey={activeTab} role="tablist" aria-label="Разделы дисциплины">
                                {DISCIPLINE_TABS.map((t, index) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        role="tab"
                                        id={`tab-${t.id}`}
                                        aria-controls={`panel-${t.id}`}
                                        tabIndex={activeTab === t.id ? 0 : -1}
                                        aria-selected={activeTab === t.id}
                                        className={`seg__item ${activeTab === t.id ? "seg__item--active" : ""}`.trim()}
                                        onClick={() => setActiveTab(t.id)}
                                        onKeyDown={(event) => handleTabKeyDown(event, index)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </SlidingCapsule>

                            <div className="card panel__body detail-content">
                                <section className="tab-panel tab-panel-active" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex="0" key={`${selectedDisciplineID}:${activeTab}`}>
                                    {activeTab === "grade" ? renderGradeTab() : activeTab === "journal" ? renderJournalTab() : activeTab === "map" ? renderMapTab() : renderTeachersTab()}
                                </section>
                            </div>
                        </article>
                    </div>
                </main>
            ) : mainNav === "schedule" ? (
                <main className="wrap dashboard-schedule-view">
                    <ScheduleView />
                </main>
            ) : (
                <main className="wrap dashboard-events-view">
                    <section className="card panel">
                        <div className="panel__head">
                            <div className="panel__title-wrap">
                                <h2 className="panel__title">История событий</h2>
                                <p className="panel__sub">Изменения оценок и посещаемости по всем дисциплинам</p>
                            </div>
                            <span className="badge badge--ember">{String(parsedGlobalEvents.length)}</span>
                        </div>
                        <div className="panel__body">
                            {request.globalEvents === "loading" ? (
                                <StateLoading />
                            ) : request.globalEvents === "error" ? (
                                <StateError
                                    title="Не удалось загрузить историю событий"
                                    details="Ошибка при запросе /api/v0/events от сервера ЮФУ"
                                    onRetry={() => loadGlobalEvents(token, currentSemesterID)}
                                />
                            ) : (
                                <EventsTable events={parsedGlobalEvents} />
                            )}
                        </div>
                    </section>
                </main>
            )}

            <div className="wrap">
                <details className="card debug-card" hidden>
                    <summary>Debug API</summary>
                    <pre>{JSON.stringify(debugLog, null, 2)}</pre>
                </details>
                <p className="footer-credit">romka навайбкодил</p>
            </div>
        </section>
    )
}
