import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { Empty } from './components/Small.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { I18nProvider, useI18n } from './i18n/index.jsx'
import { homeFor } from './lib/routes.js'
import { Companies } from './pages/admin/Companies.jsx'
import { Recruiters } from './pages/admin/Recruiters.jsx'
import { Rules } from './pages/admin/Rules.jsx'
import { Browse } from './pages/candidate/Browse.jsx'
import { PostingView } from './pages/candidate/PostingView.jsx'
import { Login } from './pages/Login.jsx'
import { Dashboard } from './pages/recruiter/Dashboard.jsx'
import { Inbox } from './pages/recruiter/Inbox.jsx'
import { PostingDetail } from './pages/recruiter/PostingDetail.jsx'
import { PostingForm } from './pages/recruiter/PostingForm.jsx'

/** Sends an unauthenticated visitor to the sign-in, and a wrong role home. */
function Shield({ kind, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (kind && user.kind !== kind) return <Navigate to={homeFor(user)} replace />
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={homeFor(user)} replace />
}

function NotFound() {
  const { t } = useI18n()
  return (
    <div className="page page--narrow" style={{ paddingTop: 64 }}>
      <Empty
        icon="alert"
        title={t('common.notFound')}
        hint={t('error.routeNotFound')}
        action={
          <Link className="btn btn--secondary" to="/">
            {t('common.back')}
          </Link>
        }
      />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                element={
                  <Shield>
                    <Layout />
                  </Shield>
                }
              >
                <Route path="/" element={<HomeRedirect />} />

                <Route path="/recruiter" element={<Navigate to="/recruiter/inbox" replace />} />
                <Route
                  path="/recruiter/inbox"
                  element={
                    <Shield kind="recruiter">
                      <Inbox />
                    </Shield>
                  }
                />
                <Route
                  path="/recruiter/postings/new"
                  element={
                    <Shield kind="recruiter">
                      <PostingForm />
                    </Shield>
                  }
                />
                <Route
                  path="/recruiter/postings/:id"
                  element={
                    <Shield kind="recruiter">
                      <PostingDetail />
                    </Shield>
                  }
                />
                <Route
                  path="/recruiter/dashboard"
                  element={
                    <Shield kind="recruiter">
                      <Dashboard />
                    </Shield>
                  }
                />

                <Route path="/candidate" element={<Navigate to="/candidate/browse" replace />} />
                <Route
                  path="/candidate/browse"
                  element={
                    <Shield kind="candidate">
                      <Browse />
                    </Shield>
                  }
                />
                <Route
                  path="/candidate/postings/:id"
                  element={
                    <Shield kind="candidate">
                      <PostingView />
                    </Shield>
                  }
                />

                <Route path="/admin" element={<Navigate to="/admin/companies" replace />} />
                <Route
                  path="/admin/companies"
                  element={
                    <Shield kind="admin">
                      <Companies />
                    </Shield>
                  }
                />
                <Route
                  path="/admin/recruiters"
                  element={
                    <Shield kind="admin">
                      <Recruiters />
                    </Shield>
                  }
                />
                <Route
                  path="/admin/rules"
                  element={
                    <Shield kind="admin">
                      <Rules />
                    </Shield>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
