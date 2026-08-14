import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Home, Bed, UserCheck, AlertOctagon, FileSpreadsheet, DollarSign, Activity, Bell } from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await API.get('/admin/stats');
        setStats(res.data);
      } catch (err) {
        setToast({ type: 'error', message: 'Failed to fetch dashboard statistics.' });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Rooms', value: stats?.total_rooms, icon: <Home className="w-5 h-5 text-gray-500" />, link: '/admin/rooms' },
    { name: 'Vacant Beds', value: stats?.available_beds, icon: <Bed className="w-5 h-5 text-green-500" />, link: '/admin/rooms' },
    { name: 'Occupied Beds', value: stats?.occupied_beds, icon: <Bed className="w-5 h-5 text-gray-500" />, link: '/admin/rooms' },
    { name: 'Pending Bookings', value: stats?.pending_bookings, icon: <FileSpreadsheet className="w-5 h-5 text-yellow-500 animate-pulse" />, link: '/admin/bookings' },
    { name: 'Active Residents', value: stats?.total_residents, icon: <UserCheck className="w-5 h-5 text-gray-500" />, link: '/admin/residents' },
    { name: 'Pending Complaints', value: stats?.pending_complaints, icon: <AlertOctagon className="w-5 h-5 text-red-500" />, link: '/admin/complaints' },
    { name: 'Pending Bills', value: stats?.pending_bills, icon: <DollarSign className="w-5 h-5 text-gray-500" />, link: '/admin/bills' },
    { name: 'Monthly Revenue', value: `₹${stats?.monthly_revenue?.toLocaleString()}`, icon: <DollarSign className="w-5 h-5 text-green-500 font-bold" />, link: '/admin/bills' },
  ];

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex justify-between items-center bg-white p-6 rounded border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            OWNER DASHBOARD
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time operations summary for Amigos Mens Luxury PG
          </p>
        </div>
        <div className="px-3 py-1 text-xs font-semibold rounded uppercase tracking-wider bg-black text-white border border-black">
          Admin Portal
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <Link 
            key={idx} 
            to={card.link}
            className="bg-white p-6 rounded border border-gray-200 hover:border-black transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.name}</span>
              {card.icon}
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {card.value}
              </h2>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded border border-gray-200 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Quick Administrator Tools</h3>
          <div className="grid grid-cols-2 gap-4 text-center text-xs font-semibold uppercase">
            <Link to="/admin/rooms" className="p-4 bg-gray-50 border border-gray-200 rounded hover:border-black transition-all">
              Manage Rooms
            </Link>
            <Link to="/admin/bookings" className="p-4 bg-gray-50 border border-gray-200 rounded hover:border-black transition-all">
              Verify Requests
            </Link>
            <Link to="/admin/bills" className="p-4 bg-gray-50 border border-gray-200 rounded hover:border-black transition-all">
              Invoicing
            </Link>
            <Link to="/admin/settings" className="p-4 bg-gray-50 border border-gray-200 rounded hover:border-black transition-all">
              Announcements
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-gray-200 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">PG Rules & Security Guard</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Verify that all resident registrations are accompanied by proper documents (Aadhaar proof and a passport size photograph) prior to room approval.
            </p>
            <p className="text-xs text-gray-600 leading-relaxed mt-2">
              Beds are auto-allocated on booking approval. Direct roommate issues are confidential and can be mediated from the "Problems With Persons" module.
            </p>
          </div>
          <Link to="/admin/reports" className="text-xs text-gray-500 font-bold uppercase hover:underline">
            View Audit Log Ledger
          </Link>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
