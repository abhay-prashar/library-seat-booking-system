import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import SeatsPage from './pages/student/SeatsPage';
import MyBookingsPage from './pages/student/MyBookingsPage';
import FinesPage from './pages/student/FinesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSeats from './pages/admin/AdminSeats';
import AdminUsers from './pages/admin/AdminUsers';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(37, 99, 235, 0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/seats'} replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student routes */}
      <Route path="/" element={
        <ProtectedRoute role="student">
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/seats" replace />} />
        <Route path="seats" element={<SeatsPage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="fines" element={<FinesPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute role="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="seats" element={<AdminSeats />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/seats" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' },
              success: { iconTheme: { primary: 'var(--accent-green)', secondary: '#ffffff' } },
              error: { iconTheme: { primary: 'var(--accent-red)', secondary: '#ffffff' } },
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
