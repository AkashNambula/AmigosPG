import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import DashboardHome from './pages/DashboardHome';
import RegisterRoom from './pages/RegisterRoom';
import RoomDetail from './pages/RoomDetail';
import Complaints from './pages/Complaints';
import PayBills from './pages/PayBills';
import FoodMenu from './pages/FoodMenu';
import ProblemsWithPersons from './pages/ProblemsWithPersons';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminRooms from './pages/AdminRooms';
import AdminBookings from './pages/AdminBookings';
import AdminResidents from './pages/AdminResidents';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Role Route Guard
function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

// Root redirect helper
function RootRedirect() {
  const { token, user, loading } = useAuth();
  
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* User/Tenant routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['tenant']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="register-room" element={<RegisterRoom />} />
            <Route path="register-room/:id" element={<RoomDetail />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="bills" element={<PayBills />} />
            <Route path="food-menu" element={<FoodMenu />} />
            <Route path="problems" element={<ProblemsWithPersons />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="residents" element={<AdminResidents />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="bills" element={<PayBills />} />
            <Route path="food-menu" element={<FoodMenu />} />
            <Route path="problems" element={<ProblemsWithPersons />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Root fallback redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
