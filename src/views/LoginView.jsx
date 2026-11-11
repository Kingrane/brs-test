import React from "react"

export default function LoginView({
    tokenInput,
    setTokenInput,
    remember,
    setRemember,
    loginStatus,
    handleLogin,
    handlePaste,
    active,
    busy
}) {
    return (
        <section className={`view ${active ? "view-active" : ""}`.trim()} aria-labelledby="loginTitle">
            <div className="wrap auth-layout">
                <aside className="auth-aside">
                    <p className="brand__top">БРС ЮФУ</p>
                    <h1 id="loginTitle" className="auth-title">Сервис БРС<br />ЮФУ</h1>
                    <p className="auth-lead">Оценки, журнал и расписание в одном месте. Для входа нужен только токен из личного кабинета БРС.</p>
                    <a className="link-inline" target="_blank" rel="noopener noreferrer" href="https://grade.sfedu.ru/sign?goal=/student/authtokenget">
                        Получить токен доступа →
                    </a>
                </aside>

                <form className="auth-card" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); if (!busy) handleLogin() }}>
                    <div className="auth-card-head">
                        <h2>Вход по токену</h2>
                        <p>Вставьте токен из личного кабинета БРС</p>
                    </div>

                    <label className="field" htmlFor="authToken">
                        <span>Токен авторизации</span>
                        <input
                            className="input mono"
                            id="authToken"
                            type="text"
                            placeholder="Вставьте токен доступа"
                            maxLength="80"
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={tokenInput}
                            onChange={(event) => setTokenInput(event.target.value)}
                        />
                    </label>

                    <div className="auth-actions-row">
                        <label className="check">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(event) => setRemember(event.target.checked)}
                            />
                            <span>Запомнить на этом устройстве</span>
                        </label>
                        <button className="btn btn--light btn--sm" type="button" onClick={handlePaste}>Вставить</button>
                    </div>

                    <div className="auth-buttons">
                        <button className="btn btn--dark btn--lg btn--block" type="submit" disabled={busy}>{busy ? "Входим…" : "Войти в БРС"}</button>
                    </div>

                    <p className={`status ${loginStatus.message ? "status-visible" : ""} ${loginStatus.type ? `status-${loginStatus.type}` : ""}`.trim()} role="status">
                        {loginStatus.message}
                    </p>

                    <p className="auth-hint">
                        <b>Где взять токен:</b> перейдите по ссылке «Получить токен доступа», войдите в БРС и скопируйте токен. Сохраняйте его только на личном устройстве.
                    </p>
                </form>
            </div>
            <p className="footer-credit">romka навайбкодил</p>
        </section>
    )
}
