import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AccessDenied, EmptyState } from './components/States'
import { Toaster } from './components/Toaster'
import { I18nProvider, useT } from './i18n'
import { GitHubError } from './services/githubApi'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { CartProvider } from './hooks/useCart'
import { ConfigProvider, useConfig } from './hooks/useProjects'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './hooks/useToast'
import { Login } from './pages/Login'
import { MemberDetail } from './pages/MemberDetail'
import { Members } from './pages/Members'
import { NewProject } from './pages/NewProject'
import { OrgSettings } from './pages/OrgSettings'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { PullRequests } from './pages/PullRequests'
import { Teams } from './pages/Teams'

/** Shown while stored token is being validated — prevents flash of login screen. */
function Booting() {
  const t = useT()
  return (
    <div className="login-wrap">
      <div className="row">
        <span className="spinner" aria-hidden="true" />
        <span className="muted">{t('app.booting')}</span>
      </div>
    </div>
  )
}

/**
 * If initial read of config repo returned 403/404, App is not installed for
 * this user — shows a single explanation screen instead of generic errors on every page.
 */
function AuthenticatedRoutes() {
  const { user } = useAuth()
  const { error, reload } = useConfig()
  const t = useT()

  if (
    error instanceof GitHubError &&
    (error.kind === 'forbidden' || error.kind === 'not-found')
  ) {
    return <AccessDenied login={user?.login} onRetry={() => void reload()} />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Projects />} />
        <Route path="projeler/yeni" element={<NewProject />} />
        <Route path="projeler/:name" element={<ProjectDetail />} />
        <Route path="uyeler" element={<Members />} />
        <Route path="uyeler/:login" element={<MemberDetail />} />
        <Route path="takimlar" element={<Teams />} />
        <Route path="pr" element={<PullRequests />} />
        <Route path="org" element={<OrgSettings />} />
        <Route
          path="*"
          element={
            <EmptyState
              icon="🧭"
              title={t('app.notFoundTitle')}
              action={
                <Link className="btn" to="/">
                  {t('app.backToProjects')}
                </Link>
              }
            />
          }
        />
      </Route>
    </Routes>
  )
}

function Gate() {
  const { status } = useAuth()
  useTheme() // ensure selected theme applies to login screen as well

  if (status === 'loading') return <Booting />
  if (status !== 'authenticated') return <Login />
  return <AuthenticatedRoutes />
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <ConfigProvider>
              <CartProvider>
                <Gate />
                <Toaster />
              </CartProvider>
            </ConfigProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
