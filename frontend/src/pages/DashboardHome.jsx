import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Home, CreditCard, AlertCircle, Bell, ArrowRight, 
  Activity, DollarSign, Users, Utensils 
} from 'lucide-react';
import Toast from '../components/Toast';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [roomStats, setRoomStats] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, billsRes, complaintsRes, notificationsRes, roomsRes] = await Promise.all([
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
      setRoomStats(roomsRes.data.stats);
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
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  const latestNotification = notifications.length > 0 ? notifications[0] : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
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

      {/* Grid: Useful Summary Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Card: Current Room */}
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Room</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {activeBooking ? `Room ${activeBooking.room?.room_number}` : 'Not Allocated'}
            </h3>
          </div>
          {activeBooking && (
            <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 uppercase font-bold">
              {activeBooking.room?.sharing_type}
            </div>
          )}
        </div>

        {/* Card: Booking Status */}
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Booking Status</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {activeBooking ? 'Approved' : (pendingBooking ? 'Pending' : 'Not Booked')}
            </h3>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 font-bold uppercase">
            {activeBooking ? 'RESIDENT' : (pendingBooking ? 'IN VERIFICATION' : 'NO BOOKINGS')}
          </div>
        </div>

        {/* Card: Bill Status */}
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bill Status</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {pendingBillsCount > 0 ? 'Pending' : 'Paid'}
            </h3>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 font-bold uppercase">
            {pendingBillsCount > 0 ? `${pendingBillsCount} Unpaid` : 'All Settled'}
          </div>
        </div>

        {/* Card: Complaints */}
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Complaints</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {openComplaintsCount} Open
            </h3>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 font-bold uppercase">
            {complaints.length} Filed
          </div>
        </div>

        {/* Card: Notifications */}
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notifications</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {unreadNotificationsCount} Unread
            </h3>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 font-bold uppercase">
            {notifications.length} Total
          </div>
        </div>
      </div>

      {/* USER DASHBOARD ROOM SUMMARY CARD */}
      {/* Room Stay and Availability Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* USER DASHBOARD ROOM SUMMARY CARD */}
        {activeBooking ? (
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Room</span>
                <span className="px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border-red-200">
                  OCCUPIED
                </span>
              </div>
              <div className="space-y-1.5 mt-4">
                <h4 className="text-2xl font-black text-gray-900">Room {activeBooking.room?.room_number}</h4>
                <p className="text-xs text-gray-500 font-medium capitalize">
                  Floor level: {activeBooking.room?.floor} Floor | Sharing: {activeBooking.room?.sharing_type}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  Monthly Rent: INR {activeBooking.room?.monthly_price?.toLocaleString()} | Security Deposit: INR {activeBooking.room?.security_deposit?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : pendingBooking ? (
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Booking</span>
                <span className="px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse">
                  PENDING
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 mt-4">
                <p className="text-sm font-semibold text-gray-900">Allocating Room {pendingBooking.room?.room_number}...</p>
                <p>Duration: {pendingBooking.duration}</p>
                <p>Rent: INR {pendingBooking.room?.monthly_price?.toLocaleString()}/month</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded border border-gray-200 text-center space-y-4 flex flex-col justify-center items-center">
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">No Room Allocated</h3>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              You do not have an active room allocation at the moment. Browse through our premium bed sharing configurations and request your reservation today.
            </p>
            <Link
              to="/dashboard/register-room"
              className="inline-block px-6 py-2 bg-black hover:bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
            >
              Browse Rooms
            </Link>
          </div>
        )}

        {/* ROOM AVAILABILITY SUMMARY */}
        {roomStats && (
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">PG Occupancy Summary</span>
                <span className="px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border-green-200">
                  Live Vacancy
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs pt-4">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Available Beds</span>
                  <span className="text-sm font-bold text-green-600">{roomStats.total_available_beds} Vacant Beds</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Occupied Beds</span>
                  <span className="text-sm font-bold text-gray-800">{roomStats.total_occupied_beds} Filled Beds</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Vacant Rooms</span>
                  <span className="font-semibold text-gray-700">{roomStats.available_rooms} / {roomStats.total_rooms} Rooms</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Full Rooms</span>
                  <span className="font-semibold text-gray-700">{roomStats.full_rooms} Rooms</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
