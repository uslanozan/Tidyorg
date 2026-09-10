import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { usePendingPRs } from '../hooks/usePendingPRs'
import { useTheme } from '../hooks/useTheme'
import { CONFIG_OWNER, CONFIG_REPO } from '../services/env'

const THEME_ICON = { system: '🖥️', light: '☀️', dark: '🌙' } as const

export function AppShell() {
  const { user, signOut } = useAuth()
  const { choice, cycle } = useTheme()
  const { t, lang, toggle } = useI18n()
  const pendingPRs = usePendingPRs()

  const themeLabel = t(`theme.${choice}`)

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/" className="brand">
            <svg
              className="brand-mark"
              viewBox="0 0 32 32"
              width="28"
              height="28"
              aria-hidden="true"
            >
              <g fill="#2f6fed">
                <rect x="2" y="12" width="8" height="8" rx="2" />
                <rect x="2" y="22" width="8" height="8" rx="2" />
                <rect x="12" y="22" width="8" height="8" rx="2" />
              </g>
              <g fill="#5b8ff5">
                <rect x="2" y="2" width="8" height="8" rx="2" />
                <rect x="12" y="12" width="8" height="8" rx="2" />
                <rect x="22" y="22" width="8" height="8" rx="2" />
              </g>
            </svg>
            <span>{t('brand')}</span>
          </NavLink>

          <nav className="nav" aria-label={t('nav.aria')}>
            <NavLink to="/" end className="nav-link">
              {t('nav.projects')}
            </NavLink>
            <NavLink to="/uyeler" className="nav-link">
              {t('nav.members')}
            </NavLink>
            <NavLink to="/takimlar" className="nav-link">
              {t('nav.teams')}
            </NavLink>
            <NavLink to="/pr" className="nav-link">
              {t('nav.pulls')}
              {pendingPRs > 0 && (
                <span className="nav-badge" aria-label={t('nav.pendingAria', { n: pendingPRs })}>
                  {pendingPRs}
                </span>
              )}
            </NavLink>
            <NavLink to="/org" className="nav-link">
              {t('nav.org')}
            </NavLink>
          </nav>

          <div className="header-spacer" />

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggle}
            aria-label={t('lang.toggleAria', { label: t(`lang.${lang}`) })}
          >
            {lang.toUpperCase()}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={cycle}
            title={themeLabel}
            aria-label={t('theme.toggleAria', { label: themeLabel })}
          >
            <span aria-hidden="true">{THEME_ICON[choice]}</span>
          </button>

          {user && (
            <div className="row" style={{ gap: 'var(--sp-2)' }}>
              <img
                className="avatar"
                src={user.avatar_url}
                alt=""
                width={28}
                height={28}
              />
              <span className="subtle header-user" style={{ maxWidth: 140 }}>
                {user.login}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
                {t('auth.signOut')}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container page">
        <Outlet />
      </main>

      <footer className="container" style={{ paddingBottom: 'var(--sp-8)' }}>
        <p className="subtle">
          {t('footer.source')}{' '}
          <a
            href={`https://github.com/${CONFIG_OWNER}/${CONFIG_REPO}`}
            target="_blank"
            rel="noreferrer"
          >
            {CONFIG_OWNER}/{CONFIG_REPO}
          </a>{' '}
          {t('footer.note')}
        </p>
      </footer>
    </>
  )
}
