import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
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
import Analytics from './pages/Analytics';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminRooms from './pages/AdminRooms';
import AdminBookings from './pages/AdminBookings';
import AdminResidents from './pages/AdminResidents';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';

// Super Admin Page
import SuperAdmin from './pages/SuperAdmin';

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

// Feature Route Guard
function FeatureRoute({ featureKey, children }) {
  const { user, tenant, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (user?.role === 'super_admin') {
    return children;
  }

  if (tenant?.features && tenant.features[featureKey] === false) {
    const fallbackPath = user?.role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

// Root redirect helper
function RootRedirect() {
  const { token, user, loading } = useAuth();
  
  if (loading) return null;
  if (!token) return <Navigate to="/login/amigospg" replace />;
  if (user?.role === 'super_admin') return <Navigate to="/super-admin" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login/superadmin" element={<Login isSuperAdmin={true} />} />
          <Route path="/login/:tenantSlug" element={<Login />} />
          <Route path="/login" element={<Navigate to="/login/amigospg" replace />} />

          <Route path="/register/:tenantSlug" element={<Register />} />
          <Route path="/register" element={<Navigate to="/register/amigospg" replace />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Super Admin route */}
          <Route 
            path="/super-admin" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['super_admin']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdmin />} />
          </Route>

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
            <Route path="register-room" element={<FeatureRoute featureKey="rooms"><RegisterRoom /></FeatureRoute>} />
            <Route path="register-room/:id" element={<FeatureRoute featureKey="rooms"><RoomDetail /></FeatureRoute>} />
            <Route path="complaints" element={<FeatureRoute featureKey="complaints"><Complaints /></FeatureRoute>} />
            <Route path="bills" element={<FeatureRoute featureKey="billing"><PayBills /></FeatureRoute>} />
            <Route path="food-menu" element={<FeatureRoute featureKey="food_menu"><FoodMenu /></FeatureRoute>} />
            <Route path="problems" element={<FeatureRoute featureKey="problems_with_persons"><ProblemsWithPersons /></FeatureRoute>} />
            <Route path="notifications" element={<FeatureRoute featureKey="notifications"><Notifications /></FeatureRoute>} />
            <Route path="analytics" element={<FeatureRoute featureKey="analytics"><Analytics /></FeatureRoute>} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin', 'super_admin']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="rooms" element={<FeatureRoute featureKey="rooms"><AdminRooms /></FeatureRoute>} />
            <Route path="bookings" element={<FeatureRoute featureKey="bookings"><AdminBookings /></FeatureRoute>} />
            <Route path="residents" element={<FeatureRoute featureKey="users"><AdminResidents /></FeatureRoute>} />
            <Route path="complaints" element={<FeatureRoute featureKey="complaints"><Complaints /></FeatureRoute>} />
            <Route path="bills" element={<FeatureRoute featureKey="billing"><PayBills /></FeatureRoute>} />
            <Route path="food-menu" element={<FeatureRoute featureKey="food_menu"><FoodMenu /></FeatureRoute>} />
            <Route path="problems" element={<FeatureRoute featureKey="problems_with_persons"><ProblemsWithPersons /></FeatureRoute>} />
            <Route path="notifications" element={<FeatureRoute featureKey="notifications"><Notifications /></FeatureRoute>} />
            <Route path="analytics" element={<FeatureRoute featureKey="analytics"><Analytics /></FeatureRoute>} />
            <Route path="reports" element={<FeatureRoute featureKey="reports"><AdminReports /></FeatureRoute>} />
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
