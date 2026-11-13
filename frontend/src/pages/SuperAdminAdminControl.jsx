import React, { useState, useEffect } from 'react';
import API, { getBackendBaseURL } from '../services/api';
import { 
  ShieldAlert, UserCheck, Search, Building2, Phone, Mail, 
  CheckCircle2, XCircle, Edit, RefreshCw, Key, Shield, Calendar, User
} from 'lucide-react';

export default function SuperAdminAdminControl() {
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    account_status: 'active',
    new_password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [usersRes, tenantsRes] = await Promise.all([
        API.get('/users/?role=admin'),
        API.get('/tenants')
      ]);
      setAdmins(usersRes.data);
      setTenants(tenantsRes.data);
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to load tenant administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTenantName = (tenantId) => {
    const found = tenants.find(t => t.id === tenantId);
    return found ? found.name : 'Unassigned / Global';
  };

  const getTenantSlug = (tenantId) => {
    const found = tenants.find(t => t.id === tenantId);
    return found ? found.slug : null;
  };

  const handleToggleStatus = async (adminUser) => {
    const newStatus = adminUser.account_status === 'active' ? 'inactive' : 'active';
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await API.put(`/users/${adminUser.id}/status?account_status=${newStatus}`);
      setSuccessMsg(`✓ Status for ${adminUser.first_name} ${adminUser.last_name} changed to ${newStatus.toUpperCase()}`);
      fetchData();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to update administrator status');
    }
  };

  const openEditModal = (adminUser) => {
    setSelectedAdmin(adminUser);
    setEditFormData({
      first_name: adminUser.first_name || '',
      last_name: adminUser.last_name || '',
      email: adminUser.email || '',
      phone: adminUser.phone || '',
      account_status: adminUser.account_status || 'active',
      new_password: ''
    });
    setShowEditModal(true);
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = editFormData.phone.replace(/\D/g, '').trim();
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit mobile number starting with 6-9.');
      return;
    }

    if (editFormData.new_password && editFormData.new_password.trim().length < 6) {
      setErrorMsg('Password must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await API.put(`/users/${selectedAdmin.id}/admin-update`, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        phone: cleanPhone,
        account_status: editFormData.account_status,
        new_password: editFormData.new_password ? editFormData.new_password.trim() : null
      });

      setSuccessMsg(`✓ Updated administrator profile for ${editFormData.email}!`);
      setShowEditModal(false);
      setSelectedAdmin(null);
      fetchData();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to update administrator details');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const fullName = `${admin.first_name} ${admin.last_name}`.toLowerCase();
    const pgName = getTenantName(admin.tenant_id).toLowerCase();
    const matchesQuery = 
      fullName.includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.phone && admin.phone.includes(searchQuery)) ||
      pgName.includes(searchQuery.toLowerCase());

    const matchesTenant = tenantFilter === 'all' || String(admin.tenant_id) === String(tenantFilter);
    const matchesStatus = statusFilter === 'all' || admin.account_status === statusFilter;

    return matchesQuery && matchesTenant && matchesStatus;
  });

  const activeAdminsCount = admins.filter(a => a.account_status === 'active').length;

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 overflow-hidden">
      {/* Top Banner */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black text-white p-6 rounded-lg shadow-lg">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight uppercase flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-amber-400" />
              Tenant Admin Control Center
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Centralized security management for PG Property Administrators across all tenants.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded shadow transition-all shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Admins</span>
          </button>
        </div>

        {/* Toasts */}
        {errorMsg && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="font-bold text-red-900">&times;</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-700 flex items-center justify-between text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="font-bold text-green-900">&times;</button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total PG Admins</p>
              <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Admins</p>
              <p className="text-2xl font-bold text-gray-900">{activeAdminsCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deactivated Admins</p>
              <p className="text-2xl font-bold text-gray-900">{admins.length - activeAdminsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="shrink-0 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Admin Name, Email, Phone or PG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">All PG Organizations</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading Tenant Administrators...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No PG Administrators found matching criteria.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600 border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 shadow-xs">
                <tr>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Admin Profile</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Contact Email & Phone</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Assigned PG Organization</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Joined Date</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Status</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAdmins.map((adminUser) => {
                  const pgName = getTenantName(adminUser.tenant_id);
                  const pgSlug = getTenantSlug(adminUser.tenant_id);
                  return (
                    <tr key={adminUser.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {adminUser.profile_image ? (
                            <img
                              src={`${getBackendBaseURL()}${adminUser.profile_image}`}
                              alt={adminUser.first_name}
                              className="h-10 w-10 object-cover rounded-full border border-gray-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-amber-500 text-black font-extrabold flex items-center justify-center text-sm">
                              {adminUser.first_name ? adminUser.first_name.charAt(0).toUpperCase() : 'A'}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{adminUser.first_name} {adminUser.last_name}</div>
                            <div className="text-xs text-gray-500">ID: #{adminUser.id} • Role: {adminUser.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-gray-900">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{adminUser.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{adminUser.phone || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold text-gray-900">{pgName}</span>
                        </div>
                        {pgSlug && (
                          <div className="text-xs font-mono text-gray-400 mt-0.5">/login/{pgSlug}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {adminUser.created_at ? new Date(adminUser.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          adminUser.account_status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : adminUser.account_status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {adminUser.account_status ? adminUser.account_status.toUpperCase() : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(adminUser)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                            title="Edit Admin Details & Reset Password"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Admin</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(adminUser)}
                            className={`px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold border transition-colors ${
                              adminUser.account_status === 'active' 
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300' 
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                            }`}
                            title={adminUser.account_status === 'active' ? 'Deactivate Admin' : 'Activate Admin'}
                          >
                            {adminUser.account_status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{adminUser.account_status === 'active' ? 'Deactivate' : 'Activate'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden my-8">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                Edit Tenant Admin: {selectedAdmin.email}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleSaveAdmin} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 font-semibold">
                PG Property Association: <span className="font-bold text-black">{getTenantName(selectedAdmin.tenant_id)}</span> (ID: #{selectedAdmin.tenant_id || 'N/A'})
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Phone Number *</label>
                  <input
                    type="text"
                    maxLength={10}
                    required
                    value={editFormData.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditFormData({ ...editFormData, phone: clean });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Account Status</label>
                  <select
                    value={editFormData.account_status}
                    onChange={(e) => setEditFormData({ ...editFormData, account_status: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  Reset Password (Leave blank to keep current password)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={editFormData.new_password}
                  onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded shadow disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Admin Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
