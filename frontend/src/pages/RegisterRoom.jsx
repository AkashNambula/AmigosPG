import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { ShieldCheck, Info, Bed } from 'lucide-react';
import Toast from '../components/Toast';

export default function RegisterRoom() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [toast, setToast] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const res = await API.get('/rooms');
        setRooms(res.data);
        
        // Extract floors and select the first floor by default
        const floors = [...new Set(res.data.map(room => room.floor))].sort((a, b) => a - b);
        if (floors.length > 0) {
          setSelectedFloor(floors[0]);
        }
      } catch (err) {
        setToast({ type: 'error', message: 'Failed to fetch available rooms.' });
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // Get unique floors
  const floors = [...new Set(rooms.map(room => room.floor))].sort((a, b) => a - b);

  // Filter rooms by selected floor
  const filteredRooms = rooms.filter(room => room.floor === selectedFloor);

  const getStatusStyle = (status, beds) => {
    if (status === 'maintenance') return 'border-red-300 bg-red-50 text-red-700';
    if (beds === 0 || status === 'full') return 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed';
    return 'border-gray-300 bg-white text-gray-900 hover:border-black hover:bg-gray-50';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          REGISTER ROOM
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a floor and click on a room number to view facility details and request allocation.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white p-12 text-center rounded border border-gray-200">
          <p className="text-gray-500">No rooms are currently configured by the administrator.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(f => {
            const floorRooms = rooms.filter(r => parseInt(r.floor) === f).sort((a, b) => a.room_number.localeCompare(b.room_number));
            const getFloorName = (fl) => {
              const suffixes = ["th", "st", "nd", "rd", "th", "th"];
              return `${fl}${suffixes[fl] || "th"} Floor`;
            };
            return (
              <div key={f} className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider border-b border-gray-100 pb-2">
                  {getFloorName(f)}
                </h3>
                {floorRooms.length === 0 ? (
                  <div className="text-xs text-gray-400 p-2 italic">No rooms configured on this floor.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {floorRooms.map(room => {
                      const isFull = room.available_beds === 0 || room.availability_status === 'full';
                      const isMaintenance = room.availability_status === 'maintenance';
                      
                      const getStatusStyle = () => {
                        if (isMaintenance) return 'border-red-300 bg-red-50/20 text-red-800 hover:border-red-500';
                        if (isFull) return 'border-gray-300 bg-gray-50/50 text-gray-700 hover:border-gray-500';
                        return 'border-green-300 bg-green-50/10 text-green-800 hover:border-green-500';
                      };

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => navigate(`/dashboard/register-room/${room.id}`)}
                          className={`p-4 rounded border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer select-none outline-none ${getStatusStyle()}`}
                        >
                          <span className="text-base font-bold font-mono tracking-tight">Room {room.room_number}</span>
                          <span className="text-[9px] uppercase font-bold text-gray-400">{room.sharing_type}</span>
                          <span className="text-[9px] font-semibold text-gray-500">₹{room.monthly_price}/mo</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white border border-gray-100 mt-1">
                            {room.available_beds} Vacant
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Legend */}
          <div className="flex gap-6 text-xs text-gray-500 justify-center pt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-green-50/10 border border-green-300 rounded"></span>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-gray-50/50 border border-gray-300 rounded"></span>
              <span>Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-red-50/20 border border-red-300 rounded"></span>
              <span>Maintenance</span>
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
