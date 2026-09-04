import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Utensils, Edit, Save, Calendar } from 'lucide-react';
import Toast from '../components/Toast';

export default function FoodMenu() {
  const { user, tenant } = useAuth();
  
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [activeDay, setActiveDay] = useState('Monday');
  
  // Edit states (Admin)
  const [isEditing, setIsEditing] = useState(false);
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [snacks, setSnacks] = useState('');
  const [dinner, setDinner] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await API.get('/food-menu');
      setMenu(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch food menu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const activeDayMenu = menu.find(item => item.day_of_week === activeDay);

  // Set form values when editing is toggled
  useEffect(() => {
    if (activeDayMenu) {
      setBreakfast(activeDayMenu.breakfast);
      setLunch(activeDayMenu.lunch);
      setSnacks(activeDayMenu.snacks);
      setDinner(activeDayMenu.dinner);
    }
  }, [activeDay, isEditing, menu]);

  const handleUpdateMenu = async (e) => {
    e.preventDefault();
    if (!breakfast || !lunch || !snacks || !dinner) {
      setToast({ type: 'error', message: 'All meal fields are required.' });
      return;
    }

    setSaving(true);
    try {
      await API.put(`/food-menu/${activeDay}`, {
        breakfast,
        lunch,
        snacks,
        dinner
      });
      setToast({ type: 'success', message: `${activeDay} menu updated successfully!` });
      setIsEditing(false);
      fetchMenu();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update food menu.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            WEEKLY FOOD MENU
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {['admin', 'super_admin'].includes(user.role) 
              ? 'Edit the breakfast, lunch, tea snacks, and dinner schedules for each day.' 
              : `Weekly food scheduler at ${tenant?.name || 'Amigos Mens Luxury PG'}.`}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Day selection tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-px">
          {days.map(day => (
            <button
              key={day}
              onClick={() => {
                setActiveDay(day);
                setIsEditing(false);
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeDay === day
                  ? 'border-black text-black font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Display menu details */}
        {activeDayMenu && (
          <div className="bg-white rounded border border-gray-200 shadow-sm p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>{activeDay.toUpperCase()} SCHEDULE</span>
              </h3>
              
              {['admin', 'super_admin'].includes(user.role) && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded hover:border-black transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Menu
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateMenu} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Breakfast (8:00 AM - 9:30 AM)</label>
                    <input
                      type="text"
                      required
                      value={breakfast}
                      onChange={(e) => setBreakfast(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Lunch (1:00 PM - 2:30 PM)</label>
                    <input
                      type="text"
                      required
                      value={lunch}
                      onChange={(e) => setLunch(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Evening Tea & Snacks (5:00 PM - 6:00 PM)</label>
                    <input
                      type="text"
                      required
                      value={snacks}
                      onChange={(e) => setSnacks(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Dinner (8:00 PM - 9:30 PM)</label>
                    <input
                      type="text"
                      required
                      value={dinner}
                      onChange={(e) => setDinner(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 text-xs font-semibold uppercase rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-black hover:bg-gray-900 text-white text-xs font-semibold uppercase rounded transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Breakfast</p>
                  <p className="text-sm font-semibold text-gray-900">{activeDayMenu.breakfast}</p>
                </div>
                
                <div className="p-4 bg-gray-50 border border-gray-100 rounded space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Lunch</p>
                  <p className="text-sm font-semibold text-gray-900">{activeDayMenu.lunch}</p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-100 rounded space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tea & Snacks</p>
                  <p className="text-sm font-semibold text-gray-900">{activeDayMenu.snacks}</p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-100 rounded space-y-1">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Dinner</p>
                  <p className="text-sm font-semibold text-gray-900">{activeDayMenu.dinner}</p>
                </div>
              </div>
            )}
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
