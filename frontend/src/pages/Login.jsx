import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Building2, AlertTriangle, HelpCircle } from 'lucide-react';
import Toast from '../components/Toast';
import API, { getBackendBaseURL } from '../services/api';

export default function Login({ isSuperAdmin: propIsSuperAdmin = false }) {
  const { tenantSlug } = useParams();
  const isSuperAdmin = propIsSuperAdmin || tenantSlug === 'superadmin';

  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(!isSuperAdmin);
  const [tenantError, setTenantError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Fetch public tenant branding if not Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      setTenantLoading(false);
      return;
    }

    const effectiveSlug = tenantSlug || 'amigospg';
    setTenantLoading(true);
    setTenantError(null);

    API.get(`/public/tenants/${effectiveSlug}`)
      .then((res) => {
        setTenantInfo(res.data);
      })
      .catch((err) => {
        setTenantError(err.friendlyMessage || 'PG Tenant property not found.');
      })
      .finally(() => {
        setTenantLoading(false);
      });
  }, [tenantSlug, isSuperAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ type: 'error', message: 'Please fill in all fields.' });
      return;
    }

    if (tenantInfo && !tenantInfo.is_active) {
      setToast({ type: 'error', message: 'This PG property is currently inactive. Login disabled.' });
      return;
    }

    setLoading(true);
    try {
      const effectiveSlug = isSuperAdmin ? null : (tenantSlug || 'amigospg');
      const loginType = isSuperAdmin ? 'super_admin' : null;

      const user = await login(email, password, effectiveSlug, loginType);
      setToast({ type: 'success', message: 'Logged in successfully!' });

      setTimeout(() => {
        if (user.role === 'super_admin') {
          navigate('/super-admin');
        } else if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 800);
    } catch (err) {
      setToast({ type: 'error', message: err || 'Invalid email or password.' });
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded shadow-md border border-gray-200">
          <HelpCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">PG Property Not Found</h2>
          <p className="text-sm text-gray-600 mb-6">
            The requested PG tenant property URL does not exist or has been removed.
          </p>
          <Link
            to="/login/amigospg"
            className="inline-block px-4 py-2 bg-black text-white rounded font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Go to AMIGOS PG Login
          </Link>
        </div>
      </div>
    );
  }

  const effectiveSlug = tenantSlug || 'amigospg';
  const logoSrc = tenantInfo?.logo_url ? `${getBackendBaseURL()}${tenantInfo.logo_url}` : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow-md border border-gray-200">
        
        {/* Header Branding */}
        <div className="text-center">
          {isSuperAdmin ? (
            <>
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow flex items-center justify-center">
                <Building2 className="h-8 w-8 mx-auto" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">
                SUPER ADMIN PORTAL
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                SaaS System Administration & Multi-Tenant Management
              </p>
            </>
          ) : (
            <>
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={tenantInfo?.name}
                  className="h-20 w-auto mx-auto mb-4 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-900 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">
                {tenantInfo?.name || 'AMIGOS PG'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {tenantInfo?.description || 'Paying Guest Management System'}
              </p>
            </>
          )}
        </div>

        {/* Inactive Tenant Banner */}
        {tenantInfo && !tenantInfo.is_active && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold mb-1">PG Property Inactive</p>
              <p>This PG tenant is currently inactive. Login and registration are disabled. Please contact administration.</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={tenantInfo && !tenantInfo.is_active}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={isSuperAdmin ? "superadmin@amigospg.com" : "user@domain.com"}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={tenantInfo && !tenantInfo.is_active}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs font-medium text-gray-500 hover:text-black hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || (tenantInfo && !tenantInfo.is_active)}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="h-5 w-5 text-gray-400 group-hover:text-gray-300" aria-hidden="true" />
              </span>
              {loading ? 'Logging in...' : isSuperAdmin ? 'Sign In to Super Admin' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Links Footer */}
        {!isSuperAdmin && (
          <div className="text-center mt-4">
            {(!tenantInfo || tenantInfo.is_active) && (
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to={`/register/${effectiveSlug}`} className="font-medium text-black hover:underline">
                  Register Here
                </Link>
              </p>
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
