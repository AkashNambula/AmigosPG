import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getBackendBaseURL } from '../services/api';
import { 
  Home, CreditCard, AlertCircle, Bell, ArrowRight, 
  Activity, DollarSign, Users, Utensils, Filter, 
  SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw 
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

  // Filter States
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterSharing, setFilterSharing] = useState([]);
  const [filterFloor, setFilterFloor] = useState([]);
  const [sortByPrice, setSortByPrice] = useState('');

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

  const handleSharingToggle = (type) => {
    setFilterSharing(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleFloorToggle = (floorNum) => {
    setFilterFloor(prev => 
      prev.includes(floorNum) ? prev.filter(f => f !== floorNum) : [...prev, floorNum]
    );
  };

  const clearAllFilters = () => {
    setFilterSharing([]);
    setFilterFloor([]);
    setSortByPrice('');
  };

  const getFloorLabel = (floor) => {
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
    return `${floor}${suffixes[floor] || 'th'} Floor`;
  };

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

  // Filter & Sort Rooms
  const filteredRooms = rooms.filter(room => {
    if (filterSharing.length > 0 && !filterSharing.includes(room.sharing_type)) {
      return false;
    }
    if (filterFloor.length > 0 && !filterFloor.includes(room.floor)) {
      return false;
    }
    return true;
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    if (sortByPrice === 'low-to-high') {
      return a.monthly_price - b.monthly_price;
    }
    if (sortByPrice === 'high-to-low') {
      return b.monthly_price - a.monthly_price;
    }
    return 0;
  });

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

      {/* 2. AVAILABLE ROOMS CATALOG WITH FILTER SECTION */}
      <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider">PG Room Search & Filters</h3>
            <p className="text-xs text-gray-500 mt-0.5">Filter by sharing type, floor level, or price catalog.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 rounded hover:border-black text-xs font-bold uppercase transition-colors bg-white select-none w-full md:w-auto"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Filter</span>
              {showFilterPanel ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>
            <button
              onClick={fetchDashboardData}
              className="p-2 border border-gray-300 rounded hover:border-black text-gray-500 hover:text-black transition-colors bg-white"
              title="Refresh Availability"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Panel Dropdown */}
        {showFilterPanel && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            {/* Sharing Filter */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Sharing Configurations</span>
              <div className="space-y-1.5 pt-1">
                {['2 Sharing', '3 Sharing', '4 Sharing', '5 Sharing'].map(type => (
                  <label key={type} className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSharing.includes(type)}
                      onChange={() => handleSharingToggle(type)}
                      className="rounded text-black border-gray-300 focus:ring-black h-3.5 w-3.5"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Floor Filter */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Floors</span>
              <div className="space-y-1.5 pt-1">
                {[1, 2, 3, 4, 5].map(floor => (
                  <label key={floor} className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterFloor.includes(floor)}
                      onChange={() => handleFloorToggle(floor)}
                      className="rounded text-black border-gray-300 focus:ring-black h-3.5 w-3.5"
                    />
                    <span>{getFloorLabel(floor)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Sort Filter */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Sort by Price</span>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer">
                  <input
                    type="radio"
                    name="sortByPrice"
                    checked={sortByPrice === 'low-to-high'}
                    onChange={() => setSortByPrice('low-to-high')}
                    className="text-black border-gray-300 focus:ring-black h-3.5 w-3.5"
                  />
                  <span>Low to High</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer">
                  <input
                    type="radio"
                    name="sortByPrice"
                    checked={sortByPrice === 'high-to-low'}
                    onChange={() => setSortByPrice('high-to-low')}
                    className="text-black border-gray-300 focus:ring-black h-3.5 w-3.5"
                  />
                  <span>High to Low</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-3 border-t border-gray-200 pt-3 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">
                Active filters: {filterSharing.length + filterFloor.length + (sortByPrice ? 1 : 0)}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Filter Result Summary Header */}
        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 p-3 rounded border border-gray-150">
          <span>
            {sortedRooms.length === 0 
              ? 'No rooms match your selected filters.' 
              : `Showing ${sortedRooms.length} available rooms`
            }
          </span>
          {(filterSharing.length > 0 || filterFloor.length > 0 || sortByPrice) && (
            <button
              onClick={clearAllFilters}
              className="text-[10px] text-red-500 hover:text-red-700 normal-case font-bold hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Room Catalog Grid */}
        {sortedRooms.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded border border-gray-150 text-sm text-gray-500 space-y-2">
            <Home className="w-12 h-12 stroke-1 mx-auto text-gray-300" />
            <p className="font-bold text-gray-700">No rooms matched your criteria.</p>
            <p className="text-xs text-gray-400">Try modifying or clearing your filters above.</p>
            <button
              onClick={clearAllFilters}
              className="mt-2 px-4 py-2 border border-gray-300 rounded hover:border-black bg-white font-bold text-xs uppercase transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRooms.map(room => {
              const isFull = room.available_beds === 0 || room.availability_status === 'full';
              return (
                <div 
                  key={room.id} 
                  className={`bg-white rounded border border-gray-250 shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                    isFull ? 'opacity-85 border-gray-200' : 'hover:shadow-md hover:border-black'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Room Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Room {room.room_number}</h4>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          {getFloorLabel(room.floor)}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded border ${
                        isFull 
                          ? 'bg-red-50 text-red-600 border-red-100' 
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {isFull ? 'FULL' : 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Image block */}
                    <div className="h-32 bg-gray-50 border border-gray-100 rounded overflow-hidden flex items-center justify-center relative">
                      {room.images && room.images.length > 0 ? (
                        <img 
                          src={`${backendBase}${room.images[0].image_path}`} 
                          alt={`Room ${room.room_number}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-gray-400 space-y-1">
                          <Home className="w-8 h-8 mx-auto stroke-1 text-gray-300" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">No Image Uploaded</span>
                        </div>
                      )}
                    </div>

                    {/* Specs Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-gray-100 py-3">
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Sharing Type</span>
                        <span className="font-semibold text-gray-800">{room.sharing_type}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Monthly Price</span>
                        <span className="font-bold text-gray-900">₹{room.monthly_price?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Available Beds</span>
                        <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                          {room.available_beds} / {room.total_capacity} Beds
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Occupancy</span>
                        <span className="font-semibold text-gray-800">{room.occupied_beds} Occupied</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-5 pb-5 pt-1">
                    {isFull ? (
                      <button
                        disabled
                        className="w-full py-2 bg-gray-150 border border-gray-200 rounded text-gray-400 text-xs font-bold uppercase cursor-not-allowed text-center"
                      >
                        No Beds Available
                      </button>
                    ) : (
                      <Link
                        to={`/dashboard/register-room/${room.id}`}
                        className="block w-full py-2 bg-black hover:bg-gray-900 text-white rounded text-xs font-bold uppercase tracking-wider text-center transition-colors"
                      >
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
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
