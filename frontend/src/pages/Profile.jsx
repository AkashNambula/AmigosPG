import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { User, Mail, Phone, MapPin, Calendar, ShieldCheck, Home } from 'lucide-react';
import Toast from '../components/Toast';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [phone, setPhone] = useState(user.phone);
  const [state, setState] = useState(user.state);
  const [city, setCity] = useState(user.city);
  
  const [activeRoom, setActiveRoom] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchAllocatedRoom = async () => {
      try {
        const res = await API.get('/bookings');
        const active = res.data.find(b => b.status === 'APPROVED');
        if (active) {
          setActiveRoom(active.room);
        }
      } catch (err) {
        // Quietly skip
      }
    };
    if (user.role === 'tenant') {
      fetchAllocatedRoom();
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !state || !city) {
      setToast({ type: 'error', message: 'All fields are required.' });
      return;
    }

    setUpdating(true);
    try {
      await API.put('/users/profile', {
        first_name: firstName,
        last_name: lastName,
        phone,
        state,
        city
      });
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      await refreshUser();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to update profile.' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-in">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          MY PROFILE
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your account details and update your contact parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Summary card */}
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6 text-center">
          <div className="inline-flex p-5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            <User className="w-12 h-12 stroke-1" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h3>
            <p className="text-xs text-gray-400 capitalize mt-1 font-mono">{user.role} Resident</p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3.5 text-left text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{user.phone}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Joined: {new Date(user.joining_date).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="capitalize">Status: {user.account_status}</span>
            </div>

            {activeRoom && (
              <div className="flex items-center gap-2 text-gray-600 pt-2 border-t border-gray-100">
                <Home className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-bold text-gray-900">Room {activeRoom.room_number} ({activeRoom.sharing_type})</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Edit form */}
        <div className="md:col-span-2 bg-white p-8 rounded border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-md font-bold uppercase tracking-tight">Edit Contact Information</h3>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Email Address (Non-Editable)</label>
              <input
                type="text"
                disabled
                value={user.email}
                className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-400 sm:text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded shadow-sm disabled:opacity-50 transition-colors"
              >
                {updating ? 'Saving Profile...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
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
