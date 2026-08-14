import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Bell, BellOff, Check, CheckSquare } from 'lucide-react';
import Toast from '../components/Toast';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch notifications.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setToast({ type: 'success', message: 'All notifications marked as read.' });
      fetchNotifications();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to mark notifications read.' });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      // Ignore
    }
  };

  const handleNotificationClick = async (notify) => {
    if (!notify.is_read) {
      try {
        await API.put(`/notifications/${notify.id}/read`);
      } catch (err) {
        // Ignore
      }
    }
    if (notify.target_route) {
      navigate(notify.target_route, { state: { highlightId: notify.reference_id } });
    } else {
      fetchNotifications();
    }
  };

  const getTypeStyles = (type) => {
    const styles = {
      booking: 'bg-blue-50 text-blue-700 border-blue-200',
      complaint: 'bg-red-50 text-red-700 border-red-200',
      bill: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      announcement: 'bg-purple-50 text-purple-700 border-purple-200',
      system: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return styles[type] || styles.system;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            NOTIFICATIONS
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated on booking status, bills, complaints, and announcements.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded hover:border-black transition-colors"
          >
            <CheckSquare className="w-4 h-4" /> Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white p-12 text-center rounded border border-gray-200 text-gray-500 flex flex-col items-center gap-3">
          <BellOff className="w-12 h-12 text-gray-400 stroke-1" />
          <p>You have no notifications at the moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {notifications.map((notify) => (
            <div 
              key={notify.id} 
              onClick={() => handleNotificationClick(notify)}
              className={`p-5 flex items-start gap-4 transition-all cursor-pointer ${
                notify.is_read ? 'bg-white opacity-70' : 'bg-gray-50/50 hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase rounded border tracking-wider ${getTypeStyles(notify.notification_type)}`}>
                  {notify.notification_type}
                </span>
              </div>

              <div className="flex-grow space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-bold text-gray-900 ${!notify.is_read && 'font-extrabold'}`}>
                    {notify.title}
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    {new Date(notify.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {notify.message}
                </p>
              </div>

              {!notify.is_read && (
                <div className="flex-shrink-0 self-center">
                  <span className="block w-2.5 h-2.5 rounded-full bg-black" title="Unread" />
                </div>
              )}
            </div>
          ))}
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
