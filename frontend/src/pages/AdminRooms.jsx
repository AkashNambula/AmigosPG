import React, { useState, useEffect } from 'react';
import API, { getBackendBaseURL } from '../services/api';
import { Plus, Edit, Trash2, Home, Upload, Check, X, ShieldAlert } from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminRooms() {
  const backendBase = getBackendBaseURL();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form states (Create/Edit)
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [roomId, setRoomId] = useState(null);
  
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [availableBeds, setAvailableBeds] = useState('');
  const [occupiedBeds, setOccupiedBeds] = useState('');
  const [roomImages, setRoomImages] = useState([]);
  const [sharingType, setSharingType] = useState('2 Sharing');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [desc, setDesc] = useState('');
  const [facilitiesStr, setFacilitiesStr] = useState('');
  const [availStatus, setAvailStatus] = useState('available');

  const [uploadingRoomId, setUploadingRoomId] = useState(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await API.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch rooms.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!floor || !roomNumber || !capacity || !price || !deposit) {
      setToast({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    const facilities = facilitiesStr.split(',').map(f => f.trim()).filter(f => f !== '');

    const data = {
      floor: parseInt(floor),
      room_number: roomNumber,
      total_capacity: parseInt(capacity),
      sharing_type: sharingType,
      monthly_price: parseFloat(price),
      security_deposit: parseFloat(deposit),
      description: desc,
      facilities,
      availability_status: availStatus
    };

    if (isEditing) {
      if (availableBeds !== '') data.available_beds = parseInt(availableBeds);
      if (occupiedBeds !== '') data.occupied_beds = parseInt(occupiedBeds);
    }

    try {
      if (isEditing) {
        await API.put(`/rooms/${roomId}`, data);
        setToast({ type: 'success', message: 'Room updated successfully!' });
      } else {
        await API.post('/rooms', data);
        setToast({ type: 'success', message: 'Room created successfully!' });
      }
      
      resetForm();
      fetchRooms();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to save room.' });
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setRoomId(null);
    setFloor('');
    setRoomNumber('');
    setCapacity('');
    setAvailableBeds('');
    setOccupiedBeds('');
    setRoomImages([]);
    setSharingType('2 Sharing');
    setPrice('');
    setDeposit('');
    setDesc('');
    setFacilitiesStr('');
    setAvailStatus('available');
  };

  const handleEditClick = (room) => {
    setIsEditing(true);
    setRoomId(room.id);
    setFloor(room.floor);
    setRoomNumber(room.room_number);
    setCapacity(room.total_capacity);
    setSharingType(room.sharing_type);
    setPrice(room.monthly_price);
    setDeposit(room.security_deposit);
    setDesc(room.description || '');
    setFacilitiesStr(room.facilities?.map(f => f.facility_name).join(', ') || '');
    setAvailStatus(room.availability_status);
    setAvailableBeds(room.available_beds);
    setOccupiedBeds(room.occupied_beds);
    setRoomImages(room.images || []);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room? This action is permanent.')) return;
    
    try {
      await API.delete(`/rooms/${id}`);
      setToast({ type: 'success', message: 'Room deleted successfully.' });
      fetchRooms();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete room.' });
    }
  };

  const handleImageUpload = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Image must be less than 5MB.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingRoomId(id);
    try {
      await API.post(`/rooms/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setToast({ type: 'success', message: 'Room image uploaded successfully!' });
      fetchRooms();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to upload room image.' });
    } finally {
      setUploadingRoomId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const floors = [1, 2, 3, 4, 5];
  const getFloorName = (fl) => {
    const suffixes = ["th", "st", "nd", "rd", "th", "th"];
    return `${fl}${suffixes[fl] || "th"} Floor`;
  };

  // Group rooms by floor
  const roomsByFloor = {};
  floors.forEach(f => {
    roomsByFloor[f] = rooms.filter(r => parseInt(r.floor) === f).sort((a, b) => a.room_number.localeCompare(b.room_number));
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            ROOM MANAGEMENT
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure rooms, prices, floors, available beds, and facilities at Amigos Mens Luxury PG.
          </p>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Room
          </button>
        )}
      </div>

      {/* Add / Edit Form Modal/Panel */}
      {showForm && (
        <div className="bg-white p-8 rounded border border-gray-200 shadow-sm space-y-6 animate-slide-in">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h3 className="text-md font-bold uppercase">
              {isEditing ? `Edit Room Details (AMPG-${roomId})` : 'Configure New Bed Room'}
            </h3>
            <button onClick={resetForm} className="text-xs text-gray-400 hover:text-black font-semibold hover:underline">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateOrUpdate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Floor Level</label>
                <input
                  type="number"
                  required
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Room Number</label>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Bed Capacity</label>
                <input
                  type="number"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 3"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            {isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Available Beds</label>
                  <input
                    type="number"
                    value={availableBeds}
                    onChange={(e) => setAvailableBeds(e.target.value)}
                    placeholder="e.g. 2"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Occupied Beds</label>
                  <input
                    type="number"
                    value={occupiedBeds}
                    onChange={(e) => setOccupiedBeds(e.target.value)}
                    placeholder="e.g. 1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Sharing Config</label>
                <select
                  value={sharingType}
                  onChange={(e) => setSharingType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                >
                  <option value="1 Sharing">1 Sharing</option>
                  <option value="2 Sharing">2 Sharing</option>
                  <option value="3 Sharing">3 Sharing</option>
                  <option value="4 Sharing">4 Sharing</option>
                  <option value="5 Sharing">5 Sharing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Monthly Price (INR)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 7000"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Security Deposit (INR)</label>
                <input
                  type="number"
                  required
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="e.g. 5000"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Availability Status</label>
                <select
                  value={availStatus}
                  onChange={(e) => setAvailStatus(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                >
                  <option value="available">Available</option>
                  <option value="full">Full (Fully Booked)</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Room Description</label>
              <textarea
                rows="2"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Attached bathroom, AC ventilation, wardrobe..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Facilities (Comma Separated)</label>
              <input
                type="text"
                value={facilitiesStr}
                onChange={(e) => setFacilitiesStr(e.target.value)}
                placeholder="e.g. Wi-Fi, AC, Attached Bathroom, TV"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            {isEditing && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-4">
                <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Room Photos</span>
                <div className="flex flex-wrap gap-4 items-center">
                  {roomImages.map((img) => (
                    <div key={img.id} className="relative">
                      <img
                        src={`${backendBase}${img.image_path}`}
                        alt="Room"
                        className="w-20 h-16 object-cover rounded border border-gray-300 shadow-sm"
                      />
                    </div>
                  ))}
                  <div className="border border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center hover:border-black transition-colors w-20 h-16 cursor-pointer">
                    <label className="cursor-pointer flex flex-col items-center justify-center text-[10px] text-gray-400 hover:text-black font-semibold text-center h-full w-full">
                      <Upload className="w-4 h-4 mb-0.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, roomId)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded transition-colors"
              >
                {isEditing ? 'Save Room Updates' : 'Add Room configuration'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(roomId);
                    resetForm();
                  }}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-sm uppercase rounded transition-colors"
                >
                  Delete Room
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Rooms Floor-based Layout */}
      <div className="space-y-6">
        {floors.map(f => {
          const floorRooms = roomsByFloor[f] || [];
          return (
            <div key={f} className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider border-b border-gray-100 pb-2 flex justify-between items-center">
                <span>{getFloorName(f)}</span>
                <span className="text-xs text-gray-400 font-normal">Rooms: {floorRooms.length}</span>
              </h3>
              {floorRooms.length === 0 ? (
                <div className="text-xs text-gray-400 p-2 italic">No rooms configured on this floor.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {floorRooms.map(room => {
                    const statusColors = {
                      available: 'border-green-300 bg-green-50/10 text-green-800 hover:border-green-500',
                      full: 'border-gray-300 bg-gray-50/50 text-gray-700 hover:border-gray-500',
                      maintenance: 'border-red-300 bg-red-50/20 text-red-800 hover:border-red-500'
                    };
                    const colorClass = statusColors[room.availability_status] || 'border-gray-200 hover:border-black';
                    
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => handleEditClick(room)}
                        className={`p-4 rounded border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer select-none outline-none ${colorClass}`}
                      >
                        <span className="text-base font-bold font-mono tracking-tight">{room.room_number}</span>
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
