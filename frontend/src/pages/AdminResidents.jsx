import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Users, Search, UserCheck, ShieldAlert, BadgeInfo } from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminResidents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      let query = '';
      const params = [];
      if (role) params.push(`role=${role}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (search) params.push(`search=${search}`);
      
      if (params.length > 0) {
        query = '?' + params.join('&');
      }
      
      const res = await API.get(`/users${query}`);
      setResidents(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch resident accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add debounce to search if needed, but fetch on filter change works immediately!
    fetchResidents();
  }, [role, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResidents();
  };

  const handleStatusChange = async (userId, newStatus) => {
    setUpdatingId(userId);
    try {
      await API.put(`/users/${userId}/status?account_status=${newStatus}`);
      setToast({ type: 'success', message: 'Resident status updated successfully.' });
      fetchResidents();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update resident account status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const triggerStatusChangeConfirm = (userId, newStatus) => {
    setConfirmDialog({
      userId,
      newStatus,
      message: `Are you sure you want to change this resident status to ${newStatus}?`
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-50 text-green-700 border-green-200',
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      inactive: 'bg-red-50 text-red-700 border-red-200'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded border uppercase tracking-wider ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  if (loading && residents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 max-w-5xl mx-auto animate-slide-in">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          USERS & RESIDENTS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse profiles, search accounts, and manage check-in/deactivation parameters.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by first name, email, phone..."
              className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <button 
            type="submit" 
            className="px-4 py-2 bg-black text-white hover:bg-gray-900 text-sm font-semibold rounded transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
          >
            <option value="">All Roles</option>
            <option value="tenant">Tenant</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Residents Roster</h3>
          <span className="text-xs text-gray-400">Total accounts: {residents.length}</span>
        </div>

        {residents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No resident records match the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50/50 uppercase text-[10px] tracking-wider font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Resident Profile</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Origin Location</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joining Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {residents.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50/30">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {res.first_name} {res.last_name}
                      <span className="block text-[10px] text-gray-400 font-mono">ID: AMPG-U{String(res.id).padStart(3, '0')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p>{res.email}</p>
                      <p className="text-xs text-gray-500 font-semibold">{res.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {res.city}, {res.state}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium uppercase text-gray-500">{res.role}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(res.joining_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(res.account_status)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {updatingId === res.id ? (
                        <span className="text-xs text-gray-400">updating...</span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {res.account_status !== 'active' && (
                            <button
                              onClick={() => triggerStatusChangeConfirm(res.id, 'active')}
                              className="px-2.5 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider transition-colors hover:border-green-400"
                            >
                              Activate
                            </button>
                          )}
                          {res.account_status !== 'inactive' && (
                            <button
                              onClick={() => triggerStatusChangeConfirm(res.id, 'inactive')}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-bold rounded uppercase tracking-wider transition-colors hover:border-red-400"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {confirmDialog && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white border border-gray-200 rounded p-6 max-w-sm w-full mx-4 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">
            Confirm Status Change
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed font-semibold">
            {confirmDialog.message}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase bg-white hover:border-black transition-colors cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const { userId, newStatus } = confirmDialog;
                setConfirmDialog(null);
                await handleStatusChange(userId, newStatus);
              }}
              className="px-4 py-2 bg-black hover:bg-gray-900 text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer select-none"
            >
              OK
            </button>
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
  </>
);
}
