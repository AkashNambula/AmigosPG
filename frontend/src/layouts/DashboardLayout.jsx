import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  Menu, X, LayoutDashboard, Home, AlertCircle, CreditCard, 
  Utensils, Users, Bell, User, LogOut, FileText, ClipboardList, ShieldAlert, Settings, BarChart
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      // Poll every 30 seconds for unread notifications
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]); // Re-fetch on route change

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigation links by role
  const tenantLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Search Room', path: '/dashboard/register-room', icon: <Home className="w-5 h-5" /> },
    { name: 'Raise a Complaint', path: '/dashboard/complaints', icon: <AlertCircle className="w-5 h-5" /> },
    { name: 'Pay Bills', path: '/dashboard/bills', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Food Menu', path: '/dashboard/food-menu', icon: <Utensils className="w-5 h-5" /> },
    { name: 'Analytics', path: '/dashboard/analytics', icon: <BarChart className="w-5 h-5" /> },
    { name: 'Problems With Persons', path: '/dashboard/problems', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'Notifications', path: '/dashboard/notifications', icon: <Bell className="w-5 h-5" />, badge: true },
    { name: 'Profile', path: '/dashboard/profile', icon: <User className="w-5 h-5" /> },
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Room Management', path: '/admin/rooms', icon: <Home className="w-5 h-5" /> },
    { name: 'Booking Requests', path: '/admin/bookings', icon: <FileText className="w-5 h-5" /> },
    { name: 'Users / Residents', path: '/admin/residents', icon: <Users className="w-5 h-5" /> },
    { name: 'Complaints', path: '/admin/complaints', icon: <AlertCircle className="w-5 h-5" /> },
    { name: 'Bills & Payments', path: '/admin/bills', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Food Menu', path: '/admin/food-menu', icon: <Utensils className="w-5 h-5" /> },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart className="w-5 h-5" /> },
    { name: 'Problems With Persons', path: '/admin/problems', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'Notifications', path: '/admin/notifications', icon: <Bell className="w-5 h-5" />, badge: true },
    { name: 'Reports & Logs', path: '/admin/reports', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const navLinks = user.role === 'admin' ? adminLinks : tenantLinks;

  const isActive = (path) => {
    if (path === '/dashboard' || path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 text-gray-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-black text-white shrink-0 border-r border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="block">
            <span className="text-lg font-bold tracking-widest uppercase block text-center">
              AMIGOS PG
            </span>
            <span className="text-[10px] text-gray-400 text-center block uppercase tracking-wider mt-1">
              Mens Luxury Living
            </span>
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

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded text-gray-400 text-sm mb-4">
            <User className="w-5 h-5" />
            <div className="truncate">
              <p className="font-medium text-white truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-950 transition-colors"
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
              <div>
                <span className="text-lg font-bold tracking-widest uppercase block">
                  AMIGOS PG
                </span>
                <span className="text-[10px] text-gray-400 block uppercase tracking-wider mt-1">
                  Mens Luxury Living
                </span>
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

            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2 rounded text-gray-400 text-sm mb-4">
                <User className="w-5 h-5" />
                <div className="truncate">
                  <p className="font-medium text-white truncate">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-gray-400 truncate capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-950 transition-colors"
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
          
          <span className="text-md font-bold tracking-widest uppercase text-gray-900">
            AMIGOS PG
          </span>

          <Link to={user.role === 'admin' ? '/admin/notifications' : '/dashboard/notifications'} className="relative p-1.5 rounded text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </Link>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
