import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AdminEventProvider } from './contexts/AdminEventContext';

// Layouts
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { ScannerLayout } from './components/ScannerLayout';

// Pages
import { RegisterPage } from './pages/RegisterPage';
import { SuccessPage } from './pages/SuccessPage';
import { EditRegistrationPage } from './pages/EditRegistrationPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminScannerPage } from './pages/AdminScannerPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { AdminEventsPage } from './pages/AdminEventsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

function AppRoutes() {

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<Layout />}>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/edit/:eventId/:token" element={<EditRegistrationPage />} />
      </Route>

      {/* Admin Auth Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Routes */}
      <Route path="/admin" element={
        <AdminEventProvider>
          <AdminLayout />
        </AdminEventProvider>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="scanner" element={<AdminScannerPage />} />
        <Route path="registrations" element={<AdminRegistrationsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Protected Scanner Routes */}
      <Route path="/scanner" element={
        <AdminEventProvider>
          <ScannerLayout />
        </AdminEventProvider>
      }>
        <Route index element={<Navigate to="/scanner/scan" replace />} />
        <Route path="scan" element={<AdminScannerPage />} />
        <Route path="registrations" element={<AdminRegistrationsPage isScannerOnly={true} />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
