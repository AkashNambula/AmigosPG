import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBackendBaseURL } from '../services/api';
import { User, Upload, Trash2, X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import Toast from './Toast';

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile, uploadProfilePhoto, removeProfilePhoto } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    new_password: '',
    confirm_new_password: ''
  });

  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        new_password: '',
        confirm_new_password: ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'first_name' || name === 'last_name') {
      const cleanValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
      return;
    }

    if (name === 'phone') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: cleanValue }));
      return;
    }

    if (name === 'email') {
      const cleanValue = value.toLowerCase().replace(/\s/g, '');
      setFormData(prev => ({ ...prev, email: cleanValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setToast({ type: 'error', message: 'Please upload a valid image (PNG, JPG, JPEG, or WEBP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'File size exceeds maximum limit of 5MB.' });
      return;
    }

    setPhotoLoading(true);
    try {
      await uploadProfilePhoto(file);
      setToast({ type: 'success', message: 'Profile photo updated successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: err || 'Failed to upload profile photo.' });
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    try {
      await removeProfilePhoto();
      setToast({ type: 'success', message: 'Profile photo removed. Default avatar restored.' });
    } catch (err) {
      setToast({ type: 'error', message: err || 'Failed to remove profile photo.' });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const cleanFirstName = formData.first_name.trim();
    const cleanLastName = formData.last_name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phone.replace(/\D/g, '').trim();

    if (!cleanFirstName || !cleanLastName) {
      setToast({ type: 'error', message: 'First name and Last name are required.' });
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setToast({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setToast({ type: 'error', message: 'Please enter a valid 10-digit mobile number starting with 6-9.' });
      return;
    }

    if (formData.new_password) {
      if (formData.new_password.length < 6) {
        setToast({ type: 'error', message: 'New password must contain at least 6 characters.' });
        return;
      }
      if (formData.new_password !== formData.confirm_new_password) {
        setToast({ type: 'error', message: 'New password and confirm password do not match.' });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone
      };

      if (formData.new_password) {
        payload.new_password = formData.new_password;
        payload.confirm_new_password = formData.confirm_new_password;
      }

      await updateUserProfile(payload);
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setToast({ type: 'error', message: err || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const photoSrc = user.profile_image ? `${getBackendBaseURL()}${user.profile_image}` : null;
  const initialLetter = (user.first_name?.charAt(0) || 'A').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden my-8 border border-gray-200">
        
        {/* Header */}
        <div className="bg-black text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Edit Profile</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: PROFILE PHOTO */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b pb-1 mb-3">
              Profile Photo
            </h3>
            <div className="flex items-center gap-4">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 shadow-sm"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 font-bold text-xl flex items-center justify-center border-2 border-amber-300 shadow-sm">
                  {initialLetter}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded border border-gray-300 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{photoLoading ? 'Uploading...' : 'Change Photo'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handlePhotoUpload}
                      disabled={photoLoading}
                      className="hidden"
                    />
                  </label>

                  {photoSrc && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={photoLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  PNG, JPG, or WEBP up to 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: PERSONAL INFORMATION */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b pb-1 mb-3">
              Personal Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Email Address *</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Phone Number *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-black focus:outline-none font-mono"
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
          </div>

          {/* Section 3: PASSWORD CHANGE */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b pb-1 mb-3 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Password (Optional)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">New Password</label>
                <input
                  type="password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-black focus:outline-none"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_new_password"
                  value={formData.confirm_new_password}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-black focus:outline-none"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-black hover:bg-gray-900 text-white font-bold text-sm rounded shadow disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
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
