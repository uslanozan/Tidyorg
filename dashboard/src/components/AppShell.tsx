import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePendingPRs } from '../hooks/usePendingPRs'
import { useTheme } from '../hooks/useTheme'
import { CONFIG_OWNER, CONFIG_REPO } from '../services/env'

const THEME_ICON = { system: '🖥️', light: '☀️', dark: '🌙' } as const
const THEME_LABEL = { system: 'Sistem teması', light: 'Açık tema', dark: 'Koyu tema' } as const

export function AppShell() {
  const { user, signOut } = useAuth()
  const { choice, cycle } = useTheme()
  const pendingPRs = usePendingPRs()

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              TO
            </span>
            <span>tidyorg</span>
          </NavLink>

          <nav className="nav" aria-label="Ana gezinme">
            <NavLink to="/" end className="nav-link">
              Projeler
            </NavLink>
            <NavLink to="/uyeler" className="nav-link">
              Üyeler
            </NavLink>
            <NavLink to="/takimlar" className="nav-link">
              Takımlar
            </NavLink>
            <NavLink to="/pr" className="nav-link">
              Bekleyen PR'lar
              {pendingPRs > 0 && (
                <span className="nav-badge" aria-label={`${pendingPRs} bekleyen PR`}>
                  {pendingPRs}
                </span>
              )}
            </NavLink>
          </nav>

          <div className="header-spacer" />

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={cycle}
            title={THEME_LABEL[choice]}
            aria-label={`Tema: ${THEME_LABEL[choice]}. Değiştirmek için tıklayın.`}
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
                Çıkış
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
          Konfigürasyon kaynağı:{' '}
          <a
            href={`https://github.com/${CONFIG_OWNER}/${CONFIG_REPO}`}
            target="_blank"
            rel="noreferrer"
          >
            {CONFIG_OWNER}/{CONFIG_REPO}
          </a>{' '}
          — her değişiklik PR olarak açılır, doğrudan yazılmaz.
        </p>
      </footer>
    </>
  )
}
