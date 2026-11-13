import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Bell, BellOff, Check, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import Toast from '../components/Toast';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
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
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to mark notifications read.' });
    }
  };

  const handleToggleRead = async (id, currentStatus) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: !currentStatus } : n))
      );
      await API.put(`/notifications/${id}/toggle-read`);
    } catch (err) {
      // Fallback
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notify) => {
    if (!notify.is_read) {
      try {
        setNotifications(prev =>
          prev.map(n => (n.id === notify.id ? { ...n, is_read: true } : n))
        );
        await API.put(`/notifications/${notify.id}/read`);
      } catch (err) {
        // Ignore
      }
    }
    if (notify.target_route) {
      navigate(notify.target_route, { state: { highlightId: notify.reference_id } });
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

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'read') return n.is_read;
    return true;
  });

  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
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
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded hover:border-black transition-colors self-start sm:self-auto"
          >
            <CheckSquare className="w-4 h-4" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs & Counters */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeFilter === 'all'
                ? 'bg-black text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveFilter('unread'); setCurrentPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeFilter === 'unread'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'unread' ? 'bg-white' : 'bg-rose-500 animate-pulse'}`}></span>
            Unopened ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveFilter('read'); setCurrentPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeFilter === 'read'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'read' ? 'bg-white' : 'bg-emerald-500'}`}></span>
            Opened ({readCount})
          </button>
        </div>

        <span className="text-xs text-gray-500 font-medium hidden sm:inline-block">
          Showing {filteredNotifications.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredNotifications.length)} of {filteredNotifications.length}
        </span>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white p-12 text-center rounded border border-gray-200 text-gray-500 flex flex-col items-center gap-3">
          <BellOff className="w-12 h-12 text-gray-400 stroke-1" />
          <p>
            {activeFilter === 'unread'
              ? 'No unopened notifications! You are all caught up.'
              : activeFilter === 'read'
              ? 'No opened notifications yet.'
              : 'You have no notifications at the moment.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {paginatedNotifications.map((notify) => (
            <div
              key={notify.id}
              onClick={() => handleNotificationClick(notify)}
              className={`p-5 flex items-start gap-4 transition-all cursor-pointer ${
                notify.is_read ? 'bg-white hover:bg-gray-50/70' : 'bg-rose-50/20 hover:bg-rose-50/40'
              }`}
            >
              {/* Type Badge */}
              <div className="flex-shrink-0 mt-1">
                <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase rounded border tracking-wider ${getTypeStyles(notify.notification_type)}`}>
                  {notify.notification_type}
                </span>
              </div>

              {/* Title & Message */}
              <div className="flex-grow space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm text-gray-900 truncate ${!notify.is_read ? 'font-bold' : 'font-semibold text-gray-700'}`}>
                    {notify.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {notify.message}
                </p>
              </div>

              {/* Timestamp & Status Button Beside It */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 flex-shrink-0">
                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                  {new Date(notify.created_at).toLocaleString()}
                </span>

                {notify.is_read ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRead(notify.id, notify.is_read);
                    }}
                    title="Opened — Click to mark as Unopened"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Opened
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRead(notify.id, notify.is_read);
                    }}
                    title="Unopened — Click to mark as Opened"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 hover:border-rose-400 transition-all shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Unopened
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border border-gray-200 rounded-md flex items-center justify-between shadow-xs">
          <div className="text-xs text-gray-500 font-medium">
            Page <span className="font-bold text-gray-900">{safePage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                safePage === 1
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-black'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePageChange(num)}
                  className={`w-7 h-7 text-xs font-bold rounded border transition-colors ${
                    safePage === num
                      ? 'bg-black text-white border-black'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                safePage === totalPages
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-black'
              }`}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
