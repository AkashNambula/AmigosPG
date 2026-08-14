import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { History, Calendar, FileText, ClipboardList } from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminReports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/audit-logs');
      setLogs(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch audit log ledger.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-slide-in">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          REPORTS & AUDIT LOGS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Historical log of administrative actions, booking clearances, and billing actions.
        </p>
      </div>

      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Audit Log Ledger</h3>
          <span className="text-xs text-gray-400">Total logs: {logs.length}</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No administrative events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50/50 uppercase text-[10px] tracking-wider font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action By</th>
                  <th className="px-6 py-3">Module</th>
                  <th className="px-6 py-3">Event Action</th>
                  <th className="px-6 py-3">Record ID</th>
                  <th className="px-6 py-3">Description / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/30 text-xs">
                    <td className="px-6 py-4 text-gray-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {log.user?.first_name} {log.user?.last_name}
                      <span className="block text-[10px] text-gray-400 font-normal">{log.user?.email}</span>
                    </td>
                    <td className="px-6 py-4 uppercase tracking-wider text-[10px] text-gray-500 font-bold">
                      {log.entity_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 border border-gray-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-400">
                      {log.entity_id ? `#${log.entity_id}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 leading-normal">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
