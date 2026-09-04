import React, { useState, useEffect } from 'react';
import API, { getBackendBaseURL } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { 
  Building2, Plus, Edit, Upload, CheckCircle2, XCircle, 
  Search, ShieldAlert, Phone, Mail, MapPin, User, Key, RefreshCw, Sliders, Trash2, Copy, ExternalLink
} from 'lucide-react';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tenantToToggle, setTenantToToggle] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Delete Tenant Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Feature Management States
  const [featureTenant, setFeatureTenant] = useState(null);
  const [featureStates, setFeatureStates] = useState({});
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const FEATURE_GROUPS = [
    {
      title: 'Core Modules',
      items: [
        { key: 'dashboard', label: 'Dashboard', desc: 'Main PG overview & statistics (Always ON)' },
        { key: 'rooms', label: 'Room Management', desc: 'Rooms, beds, and availability management' },
        { key: 'bookings', label: 'Booking Requests', desc: 'Resident registration & booking approvals' },
        { key: 'users', label: 'Users / Residents', desc: 'Resident profile & account management' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { key: 'billing', label: 'Bills & Payments', desc: 'Rent collection, utility bills & payment settings' },
        { key: 'complaints', label: 'Complaints', desc: 'Maintenance issues and complaint tracking' },
        { key: 'food_menu', label: 'Food Menu', desc: 'Weekly meal schedules and menu items' },
        { key: 'notifications', label: 'Notifications', desc: 'Alerts, announcements & broadcast messages' }
      ]
    },
    {
      title: 'Management & Analytics',
      items: [
        { key: 'analytics', label: 'Analytics', desc: 'Revenue analytics & bed occupancy stats' },
        { key: 'problems_with_persons', label: 'Problems With Persons', desc: 'Person problem reports and incident tracking' },
        { key: 'reports', label: 'Reports & Logs', desc: 'Audit logs and administrative activity reports' }
      ]
    }
  ];

  // Form states for Add PG
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_phone: '',
    admin_password: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Edit form states
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await API.get('/tenants');
      setTenants(res.data);
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to fetch PGs/tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const openFeaturesModal = async (tenant) => {
    setFeatureTenant(tenant);
    setShowFeaturesModal(true);
    setLoadingFeatures(true);
    try {
      const res = await API.get(`/tenants/${tenant.id}/features`);
      setFeatureStates(res.data.features || {});
    } catch (err) {
      setErrorMsg('Failed to load tenant features');
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleToggleFeature = (key) => {
    if (key === 'dashboard') return;
    setFeatureStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveFeatures = async () => {
    if (!featureTenant) return;
    setSavingFeatures(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await API.put(`/tenants/${featureTenant.id}/features`, { features: featureStates });
      setSuccessMsg(`Feature access permissions updated for ${featureTenant.name}`);
      setShowFeaturesModal(false);
      fetchTenants();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to update feature permissions');
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleLogoChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Please upload a valid image (PNG, JPG, JPEG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds maximum limit of 5MB.');
      return;
    }

    setErrorMsg('');
    const previewUrl = URL.createObjectURL(file);
    if (isEdit) {
      setEditLogoFile(file);
      setEditLogoPreview(previewUrl);
    } else {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Phone number validations
    const cleanAdminPhone = formData.admin_phone.replace(/\D/g, '').trim();
    if (!/^[6-9]\d{9}$/.test(cleanAdminPhone)) {
      setErrorMsg('Please enter a valid 10-digit mobile number starting with 6-9 for Admin Phone.');
      return;
    }

    if (formData.phone && formData.phone.trim()) {
      const cleanContactPhone = formData.phone.replace(/\D/g, '').trim();
      if (!/^[6-9]\d{9}$/.test(cleanContactPhone)) {
        setErrorMsg('Please enter a valid 10-digit mobile number starting with 6-9 for Contact Phone.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
      });
      if (logoFile) {
        data.append('logo_file', logoFile);
      }

      await API.post('/tenants', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg('✓ PG property and Admin account created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchTenants();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to create PG tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (editData.phone && editData.phone.trim()) {
      const cleanContactPhone = editData.phone.replace(/\D/g, '').trim();
      if (!/^[6-9]\d{9}$/.test(cleanContactPhone)) {
        setErrorMsg('Please enter a valid 10-digit mobile number starting with 6-9 for Contact Phone.');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Update tenant metadata
      await API.put(`/tenants/${selectedTenant.id}`, editData);

      // If new logo selected, upload logo
      if (editLogoFile) {
        const logoData = new FormData();
        logoData.append('logo_file', editLogoFile);
        await API.post(`/tenants/${selectedTenant.id}/logo`, logoData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setSuccessMsg(`✓ Successfully updated ${selectedTenant.name}!`);
      setShowEditModal(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to update PG details');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmModal = (tenant) => {
    setTenantToToggle(tenant);
    setShowConfirmModal(true);
  };

  const executeToggleStatus = async () => {
    if (!tenantToToggle) return;
    setConfirmLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const isDeactivating = tenantToToggle.is_active;

    try {
      await API.put(`/tenants/${tenantToToggle.id}/status`);
      setSuccessMsg(`✓ PG property '${tenantToToggle.name}' has been ${isDeactivating ? 'deactivated' : 'activated'} successfully.`);
      setShowConfirmModal(false);
      setTenantToToggle(null);
      fetchTenants();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || `Failed to ${isDeactivating ? 'deactivate' : 'activate'} PG tenant.`);
    } finally {
      setConfirmLoading(false);
    }
  };

  const openDeleteModal = (tenant) => {
    setTenantToDelete(tenant);
    setShowDeleteModal(true);
  };

  const executeDeleteTenant = async () => {
    if (!tenantToDelete) return;
    setDeleteLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const name = tenantToDelete.name;

    try {
      await API.delete(`/tenants/${tenantToDelete.id}`);
      setSuccessMsg(`✓ PG tenant '${name}' was permanently deleted.`);
      setShowDeleteModal(false);
      setTenantToDelete(null);
      fetchTenants();
    } catch (err) {
      setErrorMsg(err.friendlyMessage || `Failed to delete PG tenant '${name}'. Please try again.`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (tenant) => {
    setSelectedTenant(tenant);
    setEditData({
      name: tenant.name || '',
      description: tenant.description || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      address: tenant.address || '',
      city: tenant.city || '',
      state: tenant.state || '',
      pincode: tenant.pincode || ''
    });
    setEditLogoFile(null);
    setEditLogoPreview(tenant.logo_url ? `${getBackendBaseURL()}${tenant.logo_url}` : null);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_email: '',
      admin_phone: '',
      admin_password: '',
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCount = tenants.filter(t => t.is_active).length;

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 overflow-hidden">
      {/* FIXED TOP SECTION (Header, Toasts & Metrics) */}
      <div className="shrink-0 space-y-4">
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black text-white p-6 rounded-lg shadow-lg">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight uppercase flex items-center gap-3">
              <Building2 className="w-7 h-7 text-amber-400" />
              Super Admin SaaS Portal
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage multi-tenant PG properties, dynamic logos, and administrator accounts.
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded shadow transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Add New PG Tenant</span>
          </button>
        </div>

        {/* Toast Messages */}
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
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total PGs Onboarded</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active PGs</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deactivated PGs</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length - activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FLEXIBLE TABLE CONTAINER (Fixed Toolbar + Scrollable Tenant List) */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Refresh Toolbar (Fixed) */}
        <div className="shrink-0 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PG Name, City or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={fetchTenants}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh List
          </button>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading PG Tenants...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No PG Tenants found matching your criteria.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600 border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 shadow-xs">
                <tr>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Logo</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">PG Name & Description</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Location</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Contact</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Login URL</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 font-semibold">Status</th>
                  <th className="px-6 py-3 bg-gray-50 sticky top-0 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.logo_url ? (
                        <img
                          src={`${getBackendBaseURL()}${tenant.logo_url}`}
                          alt={tenant.name}
                          className="h-10 w-10 object-contain rounded border border-gray-200 p-0.5 bg-white shadow-sm"
                          onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-300">
                          {tenant.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{tenant.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{tenant.city || 'N/A'}, {tenant.state || ''}</div>
                      <div className="text-gray-400">{tenant.pincode || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{tenant.phone || 'N/A'}</div>
                      <div className="text-gray-400">{tenant.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-800 font-semibold border border-gray-200">
                          /login/{tenant.slug || 'amigospg'}
                        </span>
                        <button
                          onClick={() => {
                            const fullUrl = `${window.location.origin}/login/${tenant.slug || 'amigospg'}`;
                            navigator.clipboard.writeText(fullUrl);
                            setSuccessMsg(`Copied URL for ${tenant.name}! (${fullUrl})`);
                            setTimeout(() => setSuccessMsg(''), 3000);
                          }}
                          className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded transition-colors"
                          title="Copy Full Login URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tenant.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => openFeaturesModal(tenant)}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                          title="Manage Feature Access"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Features</span>
                        </button>

                        <button
                          onClick={() => openEditModal(tenant)}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                          title="Edit PG Details & Logo"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => openConfirmModal(tenant)}
                          className={`px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold border transition-colors ${
                            tenant.is_active 
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300' 
                              : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                          }`}
                          title={tenant.is_active ? 'Deactivate PG Tenant' : 'Activate PG Tenant'}
                        >
                          {tenant.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{tenant.is_active ? 'Deactivate PG' : 'Activate PG'}</span>
                        </button>

                        <button
                          onClick={() => openDeleteModal(tenant)}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-red-700 rounded-md inline-flex items-center gap-1.5 text-xs font-bold shadow-sm transition-colors"
                          title="Permanently Delete PG Tenant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete PG</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add New PG Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                Add New PG Tenant
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-sm font-semibold uppercase text-amber-600 border-b pb-1">1. PG Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">PG Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC MENS LUXURY PG"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">PG Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Executive Men Accommodation"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Contact Phone</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: clean });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Contact Email</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@abcpg.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Karnataka"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Upload PG Logo (PNG, JPG, WEBP)</label>
                <div className="flex items-center gap-4 mt-2">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="h-14 w-14 object-contain rounded border border-gray-300 bg-gray-50 p-1" />
                  ) : (
                    <div className="h-14 w-14 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                      <Upload className="w-6 h-6" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={(e) => handleLogoChange(e, false)}
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase text-amber-600 border-b pb-1 pt-2">2. PG Administrator Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Admin First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh"
                    value={formData.admin_first_name}
                    onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Admin Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kumar"
                    value={formData.admin_last_name}
                    onChange={(e) => setFormData({ ...formData, admin_last_name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Admin Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@abcpg.com"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Admin Phone *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.admin_phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, admin_phone: clean });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700">Admin Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded shadow disabled:opacity-50"
                >
                  {submitting ? 'Creating PG...' : 'Create PG Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PG Modal */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden my-8">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                Edit {selectedTenant.name}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleUpdateTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">PG Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">PG Description</label>
                <input
                  type="text"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Phone</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={editData.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditData({ ...editData, phone: clean });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">City</label>
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">State</label>
                  <input
                    type="text"
                    value={editData.state}
                    onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                  />
                </div>
              </div>

              {/* Replace Logo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Replace PG Logo</label>
                <div className="flex items-center gap-4 mt-2">
                  {editLogoPreview ? (
                    <img src={editLogoPreview} alt="Logo" className="h-12 w-12 object-contain rounded border border-gray-300 bg-white p-1" />
                  ) : (
                    <div className="h-12 w-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={(e) => handleLogoChange(e, true)}
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                </div>
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
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Features Modal */}
      {showFeaturesModal && featureTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden my-8 border border-gray-200">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  PG FEATURE ACCESS
                </h2>
                <p className="text-xs text-amber-300 font-mono mt-0.5">
                  PG: {featureTenant.name}
                </p>
              </div>
              <button
                onClick={() => setShowFeaturesModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {loadingFeatures ? (
                <div className="py-12 text-center text-gray-500">Loading tenant feature permissions...</div>
              ) : (
                FEATURE_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.items.map((item) => {
                        const isEnabled = item.key === 'dashboard' ? true : featureStates[item.key] !== false;
                        const isDashboard = item.key === 'dashboard';

                        return (
                          <div
                            key={item.key}
                            onClick={() => !isDashboard && handleToggleFeature(item.key)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                              isEnabled
                                ? 'bg-amber-50/50 border-amber-300 text-gray-900'
                                : 'bg-gray-50 border-gray-200 text-gray-400 opacity-65'
                            } ${isDashboard ? 'cursor-not-allowed opacity-90' : 'hover:shadow-sm'}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{item.label}</span>
                                {isDashboard && (
                                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                            </div>
                            
                            <div className="pt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                disabled={isDashboard}
                                onChange={() => handleToggleFeature(item.key)}
                                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFeaturesModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeatures}
                disabled={savingFeatures || loadingFeatures}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded shadow disabled:opacity-50 transition-colors"
              >
                {savingFeatures ? 'Saving Access...' : 'Save Feature Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (In-App Replace for native browser confirm) */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={tenantToToggle?.is_active ? 'Deactivate PG Tenant?' : 'Activate PG Tenant?'}
        pgName={tenantToToggle?.name}
        message={
          tenantToToggle?.is_active
            ? 'Are you sure you want to deactivate this PG property? Deactivating will prevent administrators and residents of this PG from accessing the system. All existing rooms, bookings, and data will remain safely stored.'
            : 'Are you sure you want to reactivate this PG property? Activating will restore full access for administrators and residents.'
        }
        confirmText={tenantToToggle?.is_active ? 'Deactivate PG' : 'Activate PG'}
        confirmVariant={tenantToToggle?.is_active ? 'danger' : 'success'}
        loading={confirmLoading}
        onConfirm={executeToggleStatus}
        onClose={() => {
          if (!confirmLoading) {
            setShowConfirmModal(false);
            setTenantToToggle(null);
          }
        }}
      />

      {/* Permanent Delete PG Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete PG Tenant?"
        pgName={tenantToDelete?.name}
        message="You are about to permanently delete this PG property and all of its associated records. This action CANNOT be undone. Are you sure you want to continue?"
        confirmText="Delete PG"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={executeDeleteTenant}
        onClose={() => {
          if (!deleteLoading) {
            setShowDeleteModal(false);
            setTenantToDelete(null);
          }
        }}
      />
    </div>
  );
}
