import React from "react"

function percentOf(rate, max) {
    const maxValue = Number(max)
    const rateValue = Number(rate)
    if (!Number.isFinite(maxValue) || maxValue <= 0 || !Number.isFinite(rateValue)) return null
    return Math.max(0, Math.min(100, Math.round((rateValue / maxValue) * 100)))
}

export default function ModuleCardList({ subjectInfo, disciplineMap, submodules }) {
    if (!disciplineMap?.Modules) {
        return null
    }

    const modules = Object.values(disciplineMap.Modules)
    const allSubmodules = Object.values(submodules || {})
    const submoduleIds = Object.keys(submodules || {})

    const isExamType = /exam|difftest|coursework/i.test(String(subjectInfo?.Type || ''))

    const bonusSubIds = new Set()
    const bonusRefs = Array.isArray(disciplineMap?.Bonus)
        ? disciplineMap.Bonus
        : [disciplineMap?.Bonus]
    for (const ref of bonusRefs) {
        const id = ref && typeof ref === "object" ? (ref.ID ?? ref.id ?? ref.SubmoduleID) : ref
        if (id !== undefined && id !== null) bonusSubIds.add(String(id))
    }

    const examSubIds = new Set()
    const examModuleIds = new Set()
    for (const [id, sm] of Object.entries(submodules || {})) {
        if (bonusSubIds.has(String(id))) continue
        const t = (sm.Title || '').trim()
        if (t === '' && isExamType) examSubIds.add(String(id))
        else if (/экзамен|exam|зачёт|аттестац|итогов/i.test(t)) examSubIds.add(String(id))
    }
    for (const mod of modules) {
        if (/экзамен|exam|зачёт|аттестац|итогов/i.test(mod.Title || '')) {
            ;(mod.Submodules || []).forEach(id => {
                if (!bonusSubIds.has(String(id))) examSubIds.add(String(id))
            })
            examModuleIds.add(mod.Title || '')
        }
    }

    const examId = [...examSubIds][0] || null
    const examSm = examId ? submodules[examId] : null
    const examRate = subjectInfo?.ExamRate ?? subjectInfo?.Exam?.Rate ?? disciplineMap?.Exam?.Rate ?? disciplineMap?.Final?.Rate ?? examSm?.Rate ?? null
    const examMax = 40

    const regSubs = allSubmodules.filter((sm, i) => !examSubIds.has(submoduleIds[i]) && !bonusSubIds.has(submoduleIds[i]))
    const examSubs = allSubmodules.filter((sm, i) => examSubIds.has(submoduleIds[i]))
    const bonusSubs = allSubmodules.filter((sm, i) => bonusSubIds.has(submoduleIds[i]))
    const regRate = regSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
    const regMax = regSubs.reduce((s, sm) => s + (Number(sm.MaxRate) || 0), 0)
    const exRate = examSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
    const exMax = 40
    const bonusRate = bonusSubs.reduce((s, sm) => s + (Number(sm.Rate) || 0), 0)
    const bonusMax = bonusSubs.reduce((s, sm) => s + (Number(sm.MaxRate) || 0), 0)

    const examFoundInSubs = examSubIds.size > 0
    const addExRate = (examFoundInSubs || !isExamType) ? 0 : (Number(examRate) || 0)
    const showExamRate = examFoundInSubs ? exRate : examRate
    const showExamMax = examFoundInSubs ? exMax : examMax
    const hasExamData = isExamType && (examFoundInSubs || (examRate != null && examMax != null))
    const hasBonusData = bonusSubs.length > 0

    const totalRate = regRate + bonusRate + exRate + addExRate
    const totalMax = 100

    const regPercent = percentOf(regRate, isExamType ? regMax : totalMax)
    const totalPercent = percentOf(totalRate, totalMax)

    const renderRows = (rows) => (
        <div className="group__rows">
            {rows.map((row) => (
                <div className="mrow" key={row.key}>
                    <span className="mrow__name">{row.name}</span>
                    <span className="mrow__lead" aria-hidden="true"></span>
                    <span className="mrow__val">
                        {row.rate ?? "—"} <span className="mrow__max">/ {row.max ?? "—"}</span>
                    </span>
                </div>
            ))}
        </div>
    )

    return (
        <div className="module-list">
            {modules.map((module, idx) => {
                const rows = (module.Submodules || [])
                    .filter(id => !examSubIds.has(String(id)) && !bonusSubIds.has(String(id)))
                    .map((submoduleID) => {
                        const info = submodules[submoduleID] || {}
                        return {
                            key: String(submoduleID),
                            name: info.Title || `Подмодуль ${submoduleID}`,
                            rate: info.Rate,
                            max: info.MaxRate
                        }
                    })

                return (
                    <section className="group" key={`${idx}-${module.Title || "module"}`} style={{ "--reveal-order": Math.min(idx, 4) }}>
                        <h4 className="group__title">{module.Title || "Модуль"}</h4>
                        {rows.length > 0
                            ? renderRows(rows)
                            : renderRows([{ key: "empty", name: "Нет подмодулей", rate: "—", max: "—" }])}
                    </section>
                )
            })}

            {hasBonusData && (
                <section className="group">
                    <h4 className="group__title">Бонусные баллы</h4>
                    {renderRows([{ key: "bonus", name: "Бонус", rate: bonusRate, max: bonusMax }])}
                </section>
            )}

            {hasExamData && (
                <section className="group">
                    <h4 className="group__title">Экзамен</h4>
                    {renderRows([{ key: "exam", name: "Экзамен", rate: showExamRate, max: showExamMax }])}
                </section>
            )}

            <div className="total">
                <div className="total__row">
                    <span className="total__label">Итого модули:</span>
                    <span className="total__val">
                        <b>{regRate} из {isExamType ? regMax : totalMax} баллов</b>
                    </span>
                </div>
                <div
                    className="bar"
                    role="progressbar"
                    aria-valuenow={regPercent ?? 0}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Прогресс по модулям"
                >
                    <span className="bar__fill" style={{ "--progress": (regPercent ?? 0) / 100 }}></span>
                </div>
            </div>

            <div className="total module-total-grand">
                <div className="total__row">
                    <span className="total__label">Всего по дисциплине:</span>
                    <span className="total__val">
                        <b>{totalRate} из {totalMax} баллов</b>
                    </span>
                </div>
                <div
                    className="bar"
                    role="progressbar"
                    aria-valuenow={totalPercent ?? 0}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Итоговый прогресс по дисциплине"
                >
                    <span className="bar__fill" style={{ "--progress": (totalPercent ?? 0) / 100 }}></span>
                </div>
            </div>
        </div>
    )
}
