import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API, { getBackendBaseURL } from '../services/api';
import { Home, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

export default function RegisterRoom() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const navigate = useNavigate();
  const backendBase = getBackendBaseURL();

  // Filter States
  const [sharing, setSharing] = useState('');
  const [floor, setFloor] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({ sharing: '', floor: '', sortBy: '' });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await API.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch available rooms.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleApplyFilters = () => {
    setAppliedFilters({ sharing, floor, sortBy });
  };

  const handleClearFilters = () => {
    setSharing('');
    setFloor('');
    setSortBy('');
    setAppliedFilters({ sharing: '', floor: '', sortBy: '' });
  };

  const getFloorLabel = (floorStr) => {
    const f = parseInt(floorStr);
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
    return `${f}${suffixes[f] || 'th'} Floor`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // Filter & Sort Rooms
  const filteredRooms = rooms.filter(room => {
    if (appliedFilters.sharing && room.sharing_type !== appliedFilters.sharing) return false;
    if (appliedFilters.floor && parseInt(room.floor) !== parseInt(appliedFilters.floor)) return false;
    return true;
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    if (appliedFilters.sortBy === 'low-to-high') {
      return (a.monthly_price || 0) - (b.monthly_price || 0);
    }
    if (appliedFilters.sortBy === 'high-to-low') {
      return (b.monthly_price || 0) - (a.monthly_price || 0);
    }
    return 0;
  });

  const activeFiltersCount = (appliedFilters.sharing ? 1 : 0) + (appliedFilters.floor ? 1 : 0) + (appliedFilters.sortBy ? 1 : 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wider">PG Room Search & Filters</h3>
            <p className="text-sm text-gray-500 mt-0.5">Filter by sharing type, floor level, or price catalog.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={fetchRooms}
              className="p-2 border border-gray-300 rounded hover:border-black text-gray-500 hover:text-black transition-colors bg-white flex items-center gap-2 text-xs font-bold uppercase"
              title="Refresh Availability"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Professional Filter Toolbar */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Sharing</label>
            <select
              value={sharing}
              onChange={(e) => setSharing(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
            >
              <option value="">All Sharing Types</option>
              <option value="2 Sharing">2 Sharing</option>
              <option value="3 Sharing">3 Sharing</option>
              <option value="4 Sharing">4 Sharing</option>
              <option value="5 Sharing">5 Sharing</option>
            </select>
          </div>
          
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Floor</label>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
            >
              <option value="">All Floors</option>
              <option value="1">1st Floor</option>
              <option value="2">2nd Floor</option>
              <option value="3">3rd Floor</option>
              <option value="4">4th Floor</option>
              <option value="5">5th Floor</option>
            </select>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Sort Price</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
            >
              <option value="">Default</option>
              <option value="low-to-high">Low to High</option>
              <option value="high-to-low">High to Low</option>
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={handleClearFilters}
              className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 hover:text-black font-bold text-xs uppercase rounded transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 md:flex-none px-6 py-2 bg-black text-white hover:bg-gray-900 font-bold text-xs uppercase rounded transition-colors whitespace-nowrap"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Filter Result Summary Header */}
        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 p-3 rounded border border-gray-150">
          <span>
            {sortedRooms.length === 0 
              ? 'No rooms match your selected filters.' 
              : `Showing ${sortedRooms.length} available rooms`
            }
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-black bg-gray-200 px-2 py-0.5 rounded">
              {activeFiltersCount} Active Filter{activeFiltersCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Room Catalog Grid */}
        {sortedRooms.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded border border-gray-150 text-sm text-gray-500 space-y-2">
            <Home className="w-12 h-12 stroke-1 mx-auto text-gray-300" />
            <p className="font-bold text-gray-700">No rooms matched your criteria.</p>
            <p className="text-xs text-gray-400">Try modifying or clearing your filters above.</p>
            <button
              onClick={handleClearFilters}
              className="mt-2 px-4 py-2 border border-gray-300 rounded hover:border-black bg-white font-bold text-xs uppercase transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRooms.map(room => {
              const isOccupied = room.availability_status === 'OCCUPIED' || room.availability_status === 'full' || room.available_beds === 0;
              return (
                <div 
                  key={room.id} 
                  className={`rounded border shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                    isOccupied 
                      ? 'bg-red-50/10 border-red-200 opacity-90' 
                      : 'bg-green-50/10 border-green-200 hover:shadow-md hover:border-green-400'
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
                        isOccupied 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
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
                        <span className={`font-semibold ${isOccupied ? 'text-red-600' : 'text-green-600'}`}>
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
                    {isOccupied ? (
                      <button
                        disabled
                        className="w-full py-2 bg-red-50 border border-red-200 rounded text-red-500 text-xs font-bold uppercase cursor-not-allowed text-center"
                      >
                        Booking Disabled
                      </button>
                    ) : (
                      <Link
                        to={`/dashboard/register-room/${room.id}`}
                        className="block w-full py-2 bg-black hover:bg-gray-900 text-white rounded text-xs font-bold uppercase tracking-wider text-center transition-colors"
                      >
                        View Details & Book
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
