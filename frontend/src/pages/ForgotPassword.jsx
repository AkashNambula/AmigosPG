import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import Toast from '../components/Toast';
import api from '../services/api';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setToast({ type: 'error', message: 'Please enter your email address.' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setToast({ type: 'success', message: res.data.message || 'OTP sent successfully.' });
      setStep(2);
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to request password reset.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setToast({ type: 'error', message: 'Please enter the 6-digit OTP.' });
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/auth/verify-reset-code', { email, code: otp });
      setToast({ type: 'success', message: 'OTP verified successfully.' });
      setStep(3);
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Invalid or expired OTP.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { 
        email, 
        code: otp, 
        new_password: newPassword, 
        confirm_new_password: confirmPassword 
      });
      setToast({ type: 'success', message: res.data.message || 'Password reset successfully!' });
      setStep(4);
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-black text-white rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {step === 1 && "Enter your email to receive a reset code."}
            {step === 2 && "Enter the 6-digit code sent to your email."}
            {step === 3 && "Create a new strong password."}
            {step === 4 && "You're all set!"}
          </p>
        </div>
        
        {step === 1 && (
          <form className="mt-8 space-y-6" onSubmit={handleRequestOtp}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">6-Digit Code</label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength="6"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-md text-center text-2xl tracking-widest font-mono focus:ring-black focus:border-black"
                  placeholder="000000"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <div className="text-center">
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="text-sm font-medium text-gray-500 hover:text-black hover:underline"
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="mt-8 space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            </div>
            <p className="text-gray-600">
              Your password has been successfully reset. You can now log in using your new credentials.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Go to Login <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="text-center mt-6">
            <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-black hover:underline">
              Return to Login
            </Link>
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
