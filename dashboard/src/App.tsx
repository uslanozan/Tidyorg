import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { EmptyState } from './components/States'
import { Toaster } from './components/Toaster'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ConfigProvider } from './hooks/useProjects'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './hooks/useToast'
import { Login } from './pages/Login'
import { MemberDetail } from './pages/MemberDetail'
import { NewProject } from './pages/NewProject'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { PullRequests } from './pages/PullRequests'

/** Saklı token doğrulanırken gösterilir — giriş ekranının bir an parlamasını önler. */
function Booting() {
  return (
    <div className="login-wrap">
      <div className="row">
        <span className="spinner" aria-hidden="true" />
        <span className="muted">Oturum kontrol ediliyor…</span>
      </div>
    </div>
  )
}

function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Projects />} />
        <Route path="projeler/yeni" element={<NewProject />} />
        <Route path="projeler/:name" element={<ProjectDetail />} />
        <Route path="uyeler/:login" element={<MemberDetail />} />
        <Route path="pr" element={<PullRequests />} />
        <Route
          path="*"
          element={
            <EmptyState
              icon="🧭"
              title="Sayfa bulunamadı"
              action={
                <Link className="btn" to="/">
                  Projelere dön
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
  useTheme() // seçili tema giriş ekranında da geçerli olsun

  if (status === 'loading') return <Booting />
  if (status !== 'authenticated') return <Login />
  return <AuthenticatedRoutes />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ConfigProvider>
            <Gate />
            <Toaster />
          </ConfigProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
