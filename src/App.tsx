import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, getHomeRoute, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { MessagingProvider } from './context/MessagingContext';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import CourseManagement from './pages/admin/CourseManagement';
import ModelStatusPage from './pages/admin/ModelStatusPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import AdvisorDashboard from './pages/advisor/AdvisorDashboard';
import AdvisorMessagesPage from './pages/advisor/AdvisorMessagesPage';
import AdvisorStudentDetailPage from './pages/advisor/AdvisorStudentDetailPage';
import CoursePlanner from './pages/student/CoursePlanner';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentMessagesPage from './pages/student/StudentMessagesPage';
import type { Role } from './data/courses';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: Role[];
}) {
  const { isAuthenticated, isAuthReady, user } = useAuth();

  if (!isAuthReady) {
    return <div className="min-h-screen bg-bg" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ authError: 'Your session has expired or you must sign in to continue.' }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return <>{children}</>;
}

function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? getHomeRoute(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <MessagingProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RoleHomeRedirect />} />
                <Route path="dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="courses" element={<ProtectedRoute allowedRoles={['student']}><CoursePlanner /></ProtectedRoute>} />
                <Route path="messages" element={<ProtectedRoute allowedRoles={['student']}><StudentMessagesPage /></ProtectedRoute>} />
                <Route path="profile" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="settings" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="advisor" element={<ProtectedRoute allowedRoles={['advisor']}><AdvisorDashboard /></ProtectedRoute>} />
                <Route path="advisor/student/:studentId" element={<ProtectedRoute allowedRoles={['advisor']}><AdvisorStudentDetailPage /></ProtectedRoute>} />
                <Route path="advisor/messages" element={<ProtectedRoute allowedRoles={['advisor']}><AdvisorMessagesPage /></ProtectedRoute>} />
                <Route path="advisor/courses" element={<Navigate to="/app/advisor" replace />} />
                <Route path="advisor/reports" element={<Navigate to="/app/advisor" replace />} />
                <Route path="advisor/settings" element={<Navigate to="/app/advisor" replace />} />
                <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentsPage /></ProtectedRoute>} />
                <Route path="admin/courses" element={<ProtectedRoute allowedRoles={['admin']}><CourseManagement /></ProtectedRoute>} />
                <Route path="admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
                <Route path="admin/model" element={<ProtectedRoute allowedRoles={['admin']}><ModelStatusPage /></ProtectedRoute>} />
                <Route path="admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MessagingProvider>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
