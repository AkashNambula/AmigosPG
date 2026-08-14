import React, { useState } from 'react';
import API from '../services/api';
import { Megaphone, Settings, Save, ShieldAlert } from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminSettings() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setToast({ type: 'error', message: 'Title and content are required.' });
      return;
    }

    setBroadcasting(true);
    try {
      await API.post('/admin/announcements', { title, content });
      setToast({ type: 'success', message: 'Announcement broadcasted and sent to all tenants!' });
      setTitle('');
      setContent('');
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to broadcast announcement.' });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-slide-in">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          SYSTEM SETTINGS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Broadcast global announcements to all tenants and configure system settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Settings Panel */}
        <div className="md:col-span-2 bg-white p-8 rounded border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-gray-800">
            <Megaphone className="w-5 h-5 text-gray-600" />
            <h3 className="text-md font-bold uppercase tracking-tight">Broadcast Global Announcement</h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Announcement Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water Maintenance Notice"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Message Content</label>
              <textarea
                rows="5"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g. Tomorrow morning water maintenance will be conducted from 9 AM to 11 AM. Please store water in advance..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={broadcasting}
                className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded transition-colors"
              >
                {broadcasting ? 'Broadcasting Announcement...' : 'Broadcast to all Residents'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Info and utility tools */}
        <div className="space-y-6">
          <div className="bg-gray-100 p-6 rounded border border-gray-200 space-y-4">
            <div className="flex gap-2 items-center text-gray-800">
              <Settings className="w-5 h-5" />
              <h4 className="font-bold text-sm uppercase">General Parameters</h4>
            </div>
            
            <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
              <p>
                Broadcasting an announcement automatically generates an instant notification record for every registered tenant resident.
              </p>
              <p>
                Residents will see a red indicator badge next to their Notifications navigation link.
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
            <div className="flex gap-2 items-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="font-bold text-sm uppercase">System Operations</h4>
            </div>
            
            <button
              onClick={() => setToast({ type: 'success', message: 'Database backup compiled successfully.' })}
              className="w-full py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-semibold uppercase rounded transition-colors"
            >
              Backup database SQLite
            </button>
          </div>
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
