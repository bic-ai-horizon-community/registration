import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Layouts
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';

// Pages
import { RegisterPage } from './pages/RegisterPage';
import { SuccessPage } from './pages/SuccessPage';
import { EditRegistrationPage } from './pages/EditRegistrationPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminScannerPage } from './pages/AdminScannerPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<RegisterPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/edit/:token" element={<EditRegistrationPage />} />
          </Route>

          {/* Admin Auth Route */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="scanner" element={<AdminScannerPage />} />
            <Route path="registrations" element={<AdminRegistrationsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
