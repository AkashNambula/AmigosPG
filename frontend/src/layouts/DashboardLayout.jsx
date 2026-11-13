import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getBackendBaseURL } from '../services/api';
import EditProfileModal from '../components/EditProfileModal';
import {
  Menu, X, LayoutDashboard, Home, AlertCircle, CreditCard, 
  Utensils, Users, Bell, User, LogOut, FileText, ClipboardList, ShieldAlert, Settings, BarChart, Building2, Pencil
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [logoError, setLogoError] = useState(false);

  // Reset logo error when tenant changes
  useEffect(() => {
    setLogoError(false);
  }, [tenant]);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const res = await API.get('/notifications/unread-count');
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      // Quietly ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]);

  if (!user) return null;

  const handleLogout = () => {
    const targetSlug = user?.role === 'super_admin' ? 'superadmin' : (tenant?.slug || 'amigospg');
    logout();
    if (user?.role === 'super_admin') {
      navigate('/login/superadmin');
    } else {
      navigate(`/login/${targetSlug}`);
    }
  };

  const isFeatureEnabled = (key) => {
    if (!key) return true;
    if (user?.role === 'super_admin') return true;
    if (!tenant?.features) return true;
    return tenant.features[key] !== false;
  };

  // Define navigation links by role
  const tenantLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Search Room', path: '/dashboard/register-room', icon: <Home className="w-5 h-5" />, featureKey: 'rooms' },
    { name: 'Raise a Complaint', path: '/dashboard/complaints', icon: <AlertCircle className="w-5 h-5" />, featureKey: 'complaints' },
    { name: 'Pay Bills', path: '/dashboard/bills', icon: <CreditCard className="w-5 h-5" />, featureKey: 'billing' },
    { name: 'Food Menu', path: '/dashboard/food-menu', icon: <Utensils className="w-5 h-5" />, featureKey: 'food_menu' },
    { name: 'Analytics', path: '/dashboard/analytics', icon: <BarChart className="w-5 h-5" />, featureKey: 'analytics' },
    { name: 'Problems With Persons', path: '/dashboard/problems', icon: <ShieldAlert className="w-5 h-5" />, featureKey: 'problems_with_persons' },
    { name: 'Notifications', path: '/dashboard/notifications', icon: <Bell className="w-5 h-5" />, badge: true, featureKey: 'notifications' },
    { name: 'Profile', path: '/dashboard/profile', icon: <User className="w-5 h-5" /> },
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Room Management', path: '/admin/rooms', icon: <Home className="w-5 h-5" />, featureKey: 'rooms' },
    { name: 'Booking Requests', path: '/admin/bookings', icon: <FileText className="w-5 h-5" />, featureKey: 'bookings' },
    { name: 'Users / Residents', path: '/admin/residents', icon: <Users className="w-5 h-5" />, featureKey: 'users' },
    { name: 'Complaints', path: '/admin/complaints', icon: <AlertCircle className="w-5 h-5" />, featureKey: 'complaints' },
    { name: 'Bills & Payments', path: '/admin/bills', icon: <CreditCard className="w-5 h-5" />, featureKey: 'billing' },
    { name: 'Food Menu', path: '/admin/food-menu', icon: <Utensils className="w-5 h-5" />, featureKey: 'food_menu' },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart className="w-5 h-5" />, featureKey: 'analytics' },
    { name: 'Problems With Persons', path: '/admin/problems', icon: <ShieldAlert className="w-5 h-5" />, featureKey: 'problems_with_persons' },
    { name: 'Notifications', path: '/admin/notifications', icon: <Bell className="w-5 h-5" />, badge: true, featureKey: 'notifications' },
    { name: 'Reports & Logs', path: '/admin/reports', icon: <ClipboardList className="w-5 h-5" />, featureKey: 'reports' },
    { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const superAdminLinks = [
    { name: 'Organizations', path: '/super-admin/organizations', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Admin Control', path: '/super-admin/admin-control', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'Analytics', path: '/super-admin/analytics', icon: <BarChart className="w-5 h-5" /> },
  ];

  let navLinks = tenantLinks;
  if (user.role === 'super_admin') {
    navLinks = superAdminLinks;
  } else if (user.role === 'admin') {
    navLinks = adminLinks;
  }

  // Filter links dynamically based on feature permissions
  navLinks = navLinks.filter(link => isFeatureEnabled(link.featureKey));

  const isActive = (path) => {
    if (path === '/dashboard' || path === '/admin' || path === '/super-admin/organizations') {
      return location.pathname === path || location.pathname === '/super-admin' || location.pathname === '/super-admin/';
    }
    return location.pathname.startsWith(path);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const logoSrc = (!isSuperAdmin && tenant?.logo_url) ? `${getBackendBaseURL()}${tenant.logo_url}` : null;
  const brandingTitle = isSuperAdmin ? 'SUPER ADMIN PORTAL' : (tenant?.name || 'PG MANAGEMENT');
  const brandingSubtitle = isSuperAdmin ? 'MULTI-TENANT PG MANAGEMENT' : (tenant?.description || 'Paying Guest Living');

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 text-gray-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-black text-white shrink-0 border-r border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <Link to={isSuperAdmin ? '/super-admin' : user.role === 'admin' ? '/admin' : '/dashboard'} className="flex flex-col items-center gap-2 group text-center">
            {isSuperAdmin ? (
              <div className="h-12 w-12 rounded bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-extrabold text-xl shadow-md transition-transform group-hover:scale-105">
                <Building2 className="w-7 h-7 text-black stroke-[2.5]" />
              </div>
            ) : logoSrc && !logoError ? (
              <img 
                src={logoSrc} 
                alt={brandingTitle} 
                onError={() => setLogoError(true)} 
                className="h-12 w-12 object-contain rounded bg-white p-1 shadow-sm transition-transform group-hover:scale-105" 
              />
            ) : (
              <div className="h-12 w-12 rounded bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-extrabold text-xl shadow-inner">
                {brandingTitle.charAt(0)}
              </div>
            )}
            <div className="text-center">
              <span className="text-md font-bold tracking-wider uppercase block text-white line-clamp-1">
                {brandingTitle}
              </span>
              <span className="text-[10px] text-gray-400 block uppercase tracking-widest mt-0.5 line-clamp-1">
                {brandingSubtitle}
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded text-sm font-medium transition-all ${
                isActive(link.path)
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-950'
              }`}
            >
              <div className="flex items-center gap-3">
                {link.icon}
                <span>{link.name}</span>
              </div>
              {link.badge && unreadCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive(link.path) ? 'bg-black text-white' : 'bg-red-500 text-white animate-pulse'
                }`}>
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-gray-950 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.profile_image ? (
                <img
                  src={`${getBackendBaseURL()}${user.profile_image}`}
                  alt={user.first_name}
                  className="h-8 w-8 rounded-full object-cover border border-gray-700 shrink-0"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-amber-500 text-black font-extrabold flex items-center justify-center text-xs border border-amber-400 shrink-0">
                  {user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user.first_name} {user.last_name}</p>
                <p className="text-[10px] text-gray-400 capitalize truncate">{user.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={() => setEditProfileOpen(true)}
              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded transition-colors shrink-0"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-950 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Drawer for Mobile & Tablet */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <aside 
            className="flex flex-col w-64 bg-black text-white h-full border-r border-gray-800 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {isSuperAdmin ? (
                  <div className="h-8 w-8 rounded bg-amber-500 flex items-center justify-center text-black font-extrabold text-sm shadow">
                    <Building2 className="w-5 h-5 text-black stroke-[2.5]" />
                  </div>
                ) : logoSrc && !logoError ? (
                  <img src={logoSrc} alt={brandingTitle} onError={() => setLogoError(true)} className="h-8 w-8 object-contain rounded bg-white p-0.5" />
                ) : (
                  <div className="h-8 w-8 rounded bg-amber-500 flex items-center justify-center text-black font-extrabold text-sm">
                    {brandingTitle.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="text-md font-bold tracking-widest uppercase block text-white line-clamp-1">
                    {brandingTitle}
                  </span>
                  <span className="text-[10px] text-gray-400 block uppercase tracking-wider mt-0.5 line-clamp-1">
                    {brandingSubtitle}
                  </span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded text-sm font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {link.icon}
                    <span>{link.name}</span>
                  </div>
                  {link.badge && unreadCount > 0 && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-2">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.profile_image ? (
                    <img
                      src={`${getBackendBaseURL()}${user.profile_image}`}
                      alt={user.first_name}
                      className="h-8 w-8 rounded-full object-cover border border-gray-700 shrink-0"
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-amber-500 text-black font-extrabold flex items-center justify-center text-xs border border-amber-400 shrink-0">
                      {user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{user.first_name} {user.last_name}</p>
                    <p className="text-[10px] text-gray-400 capitalize truncate">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSidebarOpen(false); setEditProfileOpen(true); }}
                  className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded transition-colors shrink-0"
                  title="Edit Profile"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-950 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex lg:hidden items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <span className="text-md font-bold tracking-widest uppercase text-gray-900 truncate max-w-[200px]">
            {brandingTitle}
          </span>

          <Link to={user.role === 'admin' ? '/admin/notifications' : '/dashboard/notifications'} className="relative p-1.5 rounded text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </Link>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />
    </div>
  );
}
