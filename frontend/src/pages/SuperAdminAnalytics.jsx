import React, { useState, useEffect } from 'react';
import API, { getBackendBaseURL } from '../services/api';
import { 
  BarChart, Building2, Users, UserCheck, Home, Bed, 
  FileText, AlertCircle, RefreshCw, CheckCircle2, TrendingUp, DollarSign
} from 'lucide-react';

export default function SuperAdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [statsRes, tenantsRes] = await Promise.all([
        API.get('/admin/superadmin-stats'),
        API.get('/tenants')
      ]);
      setStats(statsRes.data);
      setTenants(tenantsRes.data);
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Failed to load Super Admin Analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalBeds = stats ? (stats.occupied_beds + stats.available_beds) : 0;
  const occupancyRate = totalBeds > 0 ? Math.round((stats.occupied_beds / totalBeds) * 100) : 0;

  return (
    <div className="h-full flex flex-col min-h-0 space-y-6 overflow-y-auto pr-1">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black text-white p-6 rounded-lg shadow-lg shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight uppercase flex items-center gap-3">
            <BarChart className="w-7 h-7 text-amber-400" />
            Global Multi-Tenant System Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time multi-tenant aggregate metrics calculated across all PG properties and administrators.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded shadow transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm shadow-sm shrink-0">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
          Loading Global Analytics...
        </div>
      ) : stats && (
        <>
          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {/* Organizations Card */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PG Organizations</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.total_tenants}</p>
                <p className="text-xs text-green-600 font-medium mt-1">
                  {stats.active_tenants} Active • {stats.inactive_tenants} Inactive
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Building2 className="w-7 h-7" />
              </div>
            </div>

            {/* Total Admins Card */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PG Administrators</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.total_admins}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Property Managers</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <UserCheck className="w-7 h-7" />
              </div>
            </div>

            {/* Total Residents Card */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Residents</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.total_residents}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Across All PGs</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-7 h-7" />
              </div>
            </div>

            {/* Total Revenue Card */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Rent Collections</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">₹{stats.total_revenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-600 font-medium mt-1">Paid Invoices Total</p>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Operational Metrics Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
            {/* Rooms & Bed Capacity Card */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Bed className="w-5 h-5 text-amber-500" />
                  Room & Bed Capacity
                </h3>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  {occupancyRate}% Occupied
                </span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Total Rooms Managed:</span>
                  <span className="font-bold text-gray-900">{stats.total_rooms}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Occupied Beds:</span>
                  <span className="font-bold text-green-600">{stats.occupied_beds}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Available Beds:</span>
                  <span className="font-bold text-amber-600">{stats.available_beds}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700 font-semibold border-t pt-2">
                  <span>Total Bed Capacity:</span>
                  <span className="font-extrabold text-gray-900">{totalBeds}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>

            {/* Booking Requests Summary */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Booking Requests
                </h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                  {stats.pending_bookings} Pending
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Pending Approval Requests:</span>
                  <span className="font-bold text-amber-600">{stats.pending_bookings}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Approved Bookings:</span>
                  <span className="font-bold text-green-600">{stats.approved_bookings}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700 font-semibold border-t pt-2">
                  <span>Total Processed Requests:</span>
                  <span className="font-extrabold text-gray-900">{stats.pending_bookings + stats.approved_bookings}</span>
                </div>
              </div>
            </div>

            {/* Maintenance Complaints Summary */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Maintenance Complaints
                </h3>
                <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full">
                  {stats.open_complaints} Unresolved
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Open / In-Progress Complaints:</span>
                  <span className="font-bold text-red-600">{stats.open_complaints}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Resolved Complaints:</span>
                  <span className="font-bold text-green-600">{stats.resolved_complaints}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700 font-semibold border-t pt-2">
                  <span>Total Logged Incidents:</span>
                  <span className="font-extrabold text-gray-900">{stats.open_complaints + stats.resolved_complaints}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Organizations Breakdown Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4 shrink-0">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Building2 className="w-5 h-5 text-amber-500" />
              PG Property Breakdown Summary
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PG Property Name</th>
                    <th className="px-4 py-3 font-semibold">Slug / URL</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Contact Email</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                        {t.logo_url ? (
                          <img src={`${getBackendBaseURL()}${t.logo_url}`} alt={t.name} className="h-6 w-6 object-contain rounded border border-gray-200" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                            {t.name.charAt(0)}
                          </div>
                        )}
                        <span>{t.name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">/login/{t.slug || 'amigospg'}</td>
                      <td className="px-4 py-3 text-xs">{t.city || 'N/A'}, {t.state || ''}</td>
                      <td className="px-4 py-3 text-xs">{t.email || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
