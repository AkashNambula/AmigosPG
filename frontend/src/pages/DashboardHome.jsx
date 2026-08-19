import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getBackendBaseURL } from '../services/api';
import { 
  Home, CreditCard, AlertCircle, Bell, ArrowRight, 
  Activity, DollarSign, Users, Utensils 
} from 'lucide-react';
import Toast from '../components/Toast';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const backendBase = getBackendBaseURL();
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);


  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, billsRes, complaintsRes, notificationsRes, availabilityRes] = await Promise.all([
        API.get('/bookings'),
        API.get('/bills'),
        API.get('/complaints'),
        API.get('/notifications'),
        API.get('/rooms/availability'),
      ]);
      
      setBookings(bookingsRes.data);
      setBills(billsRes.data);
      setComplaints(complaintsRes.data);
      setNotifications(notificationsRes.data);
      setRooms(availabilityRes.data.rooms);
      setStats(availabilityRes.data.stats);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load dashboard data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // Find active approved booking or pending booking
  const activeBooking = bookings.find(b => b.status === 'APPROVED');
  const pendingBooking = bookings.find(b => b.status === 'PENDING');

  // Compute stats
  const pendingBillsCount = bills.filter(b => b.status === 'PENDING').length;
  const pendingBillsTotal = bills.filter(b => b.status === 'PENDING').reduce((acc, b) => acc + b.total_amount, 0);
  const openComplaintsCount = complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED').length;
  const latestNotification = notifications.length > 0 ? notifications[0] : null;


  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex justify-between items-center bg-white p-6 rounded border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            WELCOME, {user.first_name.toUpperCase()} {user.last_name.toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resident Dashboard for Amigos Mens Luxury PG
          </p>
        </div>
        <div className="px-3 py-1 text-xs font-semibold rounded uppercase tracking-wider bg-gray-100 border border-gray-300">
          Status: {user.account_status}
        </div>
      </div>

      {/* 1. ROOM AVAILABILITY SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded border border-gray-250 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Available Rooms</span>
            <h2 className="text-4xl font-extrabold text-green-600 mt-2">{stats?.available_rooms ?? 0}</h2>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100 flex justify-between font-medium">
            <span>Vacant Beds:</span>
            <span className="font-bold text-gray-700">{stats?.total_available_beds ?? 0} Vacant</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded border border-gray-250 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Full Rooms</span>
            <h2 className="text-4xl font-extrabold text-red-500 mt-2">{stats?.full_rooms ?? 0}</h2>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100 flex justify-between font-medium">
            <span>Beds Availability:</span>
            <span className="font-bold text-gray-700">0 Beds Vacant</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded border border-gray-250 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total PG Rooms</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-2">{stats?.total_rooms ?? 0}</h2>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100 flex justify-between font-medium">
            <span>Occupancy Rate:</span>
            <span className="font-bold text-gray-700">{stats?.total_occupied_beds ?? 0} Beds Occupied</span>
          </div>
        </div>
      </div>

      {/* No Booking Flow Alert */}
      {!activeBooking && !pendingBooking && (
        <div className="bg-white p-8 rounded border border-gray-200 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-gray-100 text-gray-600">
            <Home className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">You have not registered a room yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Browse our floor layouts and room availability below to reserve a bed sharing configuration.
          </p>
        </div>
      )}

      {/* Pending Booking Flow */}
      {!activeBooking && pendingBooking && (
        <div className="bg-white p-8 rounded border border-gray-200 space-y-4">
          <div className="flex items-center gap-3 text-yellow-600">
            <Activity className="w-6 h-6 animate-pulse" />
            <h3 className="text-lg font-bold">Booking Request Pending Approval</h3>
          </div>
          <p className="text-sm text-gray-600">
            Your booking request for **Room {pendingBooking.room?.room_number}** ({pendingBooking.room?.sharing_type}) is currently **PENDING** admin verification. We are reviewing your uploaded documents and will approve your request shortly.
          </p>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm space-y-2 max-w-md">
            <p><span className="font-semibold text-gray-700">Start Date:</span> {new Date(pendingBooking.booking_start_date).toLocaleDateString()}</p>
            <p><span className="font-semibold text-gray-700">Duration:</span> {pendingBooking.duration}</p>
            <p><span className="font-semibold text-gray-700">Monthly Rent:</span> INR {pendingBooking.room?.monthly_price?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Active Room Statistics Dashboard */}
      {activeBooking && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">My Stay Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card: Current Room */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Current Accommodation</span>
                  <Home className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
                  Room {activeBooking.room?.room_number}
                </h2>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  Floor: {activeBooking.room?.floor} | Sharing: {activeBooking.room?.sharing_type}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-600">
                <span>Beds Count: {activeBooking.room?.total_capacity}</span>
                <span>Available: {activeBooking.room?.available_beds}</span>
              </div>
            </div>

            {/* Card: Monthly Rent / Security Deposit */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Monthly Price & Deposit</span>
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
                  INR {activeBooking.room?.monthly_price?.toLocaleString()}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Security Deposit: INR {activeBooking.room?.security_deposit?.toLocaleString()}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-600">
                <span>Booked Duration: {activeBooking.duration}</span>
                <span>Start: {new Date(activeBooking.booking_start_date).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Card: Bills & Payments summary */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Pending Invoices</span>
                  <CreditCard className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
                  INR {pendingBillsTotal.toLocaleString()}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Pending Bills Count: {pendingBillsCount}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  to="/dashboard/bills" 
                  className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
                >
                  <span>View & Pay Invoices</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card: Complaints summary */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Complaint Status</span>
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
                  {openComplaintsCount} Active
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Total Filed Complaints: {complaints.length}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  to="/dashboard/complaints" 
                  className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
                >
                  <span>Report / Track Issues</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card: Food Menu summary */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Weekly Food Menu</span>
                  <Utensils className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mt-2 truncate">
                  Today's Menu
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Check weekly food scheduler details.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  to="/dashboard/food-menu" 
                  className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
                >
                  <span>View Complete Menu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card: Latest notification */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Latest Update</span>
                  <Bell className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-md font-bold text-gray-900 mt-2 truncate">
                  {latestNotification ? latestNotification.title : 'No Notifications'}
                </h2>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {latestNotification ? latestNotification.message : 'You are all caught up!'}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  to="/dashboard/notifications" 
                  className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
                >
                  <span>All Notifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}



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
