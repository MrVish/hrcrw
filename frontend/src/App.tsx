import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { AuthProvider, AppStateProvider } from './contexts'
import { UIProvider } from './contexts/UIContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastContainer } from './components/common/MaterialToast'
import { LoadingOverlay } from './components/common/MaterialLoadingSpinner'
import { useUI } from './contexts/UIContext'
import { useAriaHiddenCleanup } from './hooks/useAriaHiddenCleanup'
import {
  LoginPage,
  DashboardPage,
  ClientListPage,
  ReviewListPage,
  ExceptionListPage,
  AuditLogsPage,
  UserManagementPage,
  MyTasksPage
} from './pages'
import theme from './theme'
import './styles/accessibility.css'
import './styles/high-contrast.css'

const AppContent: React.FC = () => {
  const { state, removeToast } = useUI()

  // Prevent root element from getting stuck with aria-hidden
  useAriaHiddenCleanup()

  return (
    <LoadingOverlay isLoading={state.globalLoading} text="Loading...">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedRoute>
              <ReviewListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews/create"
          element={
            <ProtectedRoute>
              <ReviewListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews/:id"
          element={
            <ProtectedRoute>
              <ReviewListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute>
              <ExceptionListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute requiredRoles={['Admin', 'Checker']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRoles={['Admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tasks"
          element={
            <ProtectedRoute>
              <MyTasksPage />
            </ProtectedRoute>
          }
        />
      </Routes>

      <ToastContainer
        toasts={state.toasts}
        onDismiss={removeToast}
        position="top-right"
      />
    </LoadingOverlay>
  )
}

function App() {
  const handleGlobalError = (error: Error, errorInfo: any) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error boundary caught:', error, errorInfo)
    }

    // In production, report to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary onError={handleGlobalError}>
        <UIProvider>
          <AuthProvider>
            <AppStateProvider>
              <Router>
                <AppContent />
              </Router>
            </AppStateProvider>
          </AuthProvider>
        </UIProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App