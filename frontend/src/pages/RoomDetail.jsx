import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getBackendBaseURL } from '../services/api';
import { ArrowLeft, Home, BadgeInfo, CheckCircle, FileText, Upload } from 'lucide-react';
import Toast from '../components/Toast';

export default function RoomDetail() {
  const backendBase = getBackendBaseURL();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [toast, setToast] = useState(null);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('1 Month');
  const [customDays, setCustomDays] = useState('');
  const [bagsCount, setBagsCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await API.get(`/rooms/${id}`);
        setRoom(res.data);
      } catch (err) {
        setToast({ type: 'error', message: 'Failed to fetch room details.' });
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Room not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-black hover:underline flex items-center gap-1 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: `File size for ${file.name} exceeds 5MB limit.` });
      e.target.value = ''; // Reset input
      return;
    }

    // Validate type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setToast({ type: 'error', message: `Unsupported format for ${file.name}. Allowed: PDF, JPG, PNG.` });
      e.target.value = '';
      return;
    }

    if (fileType === 'aadhaar') {
      setAadhaarFile(file);
    } else if (fileType === 'photo') {
      setPhotoFile(file);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!startDate) {
      setToast({ type: 'error', message: 'Please select a booking start date.' });
      return;
    }
    if (duration === 'Custom' && (!customDays || customDays <= 0)) {
      setToast({ type: 'error', message: 'Please specify the duration in custom days.' });
      return;
    }
    if (!aadhaarFile || !photoFile) {
      setToast({ type: 'error', message: 'Aadhaar ID Proof and Profile Photo are required.' });
      return;
    }
    if (!termsAccepted) {
      setToast({ type: 'error', message: 'Please accept the Terms and Conditions before continuing.' });
      return;
    }

    setSubmitting(true);
    try {
      // Create Multipart Form Data
      const formData = new FormData();
      formData.append('room_id', room.id);
      formData.append('booking_start_date', startDate);
      formData.append('duration', duration);
      if (duration === 'Custom') {
        formData.append('custom_days', customDays);
      }
      formData.append('luggage_bags_count', bagsCount);
      formData.append('additional_notes', notes);
      formData.append('terms_accepted', termsAccepted);
      formData.append('aadhaar_id', aadhaarFile);
      formData.append('user_photo', photoFile);

      await API.post('/bookings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setToast({ type: 'success', message: 'Booking request submitted successfully.' });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Unable to submit your booking request. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Header */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Rooms List
      </button>

      {/* Room Details Panel */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Mock Room Image or Placeholder */}
        <div className="bg-gray-100 p-8 flex flex-col justify-center items-center border-r border-gray-200 min-h-[300px]">
          {room.images && room.images.length > 0 ? (
            <img 
              src={`${backendBase}${room.images[0].image_path}`} 
              alt={`Room ${room.room_number}`} 
              className="max-h-64 object-contain rounded"
            />
          ) : (
            <div className="text-center text-gray-400 space-y-2">
              <Home className="w-16 h-16 mx-auto stroke-1" />
              <p className="text-xs uppercase font-semibold tracking-wider">No Image Uploaded</p>
            </div>
          )}
        </div>

        {/* Right Side: Room Info */}
        <div className="p-8 space-y-6">
          <div>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-gray-100 border border-gray-300 rounded tracking-wider">
              {room.sharing_type}
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-2">ROOM {room.room_number}</h1>
            <p className="text-sm text-gray-500 mt-1 capitalize">Floor Level: {room.floor} Floor</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Monthly Rent</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">INR {room.monthly_price?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Security Deposit</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">INR {room.security_deposit?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Beds Available</p>
              <p className="text-lg font-bold text-gray-950 mt-0.5">{room.available_beds} Vacant / {room.total_capacity} Total</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider mt-1 ${
                (room.availability_status === 'OCCUPIED' || room.availability_status === 'full' || room.available_beds === 0)
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              }`}>
                {(room.availability_status === 'OCCUPIED' || room.availability_status === 'full' || room.available_beds === 0)
                  ? 'OCCUPIED'
                  : 'AVAILABLE'
                }
              </span>
            </div>
          </div>

          {/* Description */}
          {room.description && (
            <div className="space-y-1">
              <h4 className="text-xs text-gray-400 uppercase font-semibold">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{room.description}</p>
            </div>
          )}

          {/* Facilities */}
          <div className="space-y-2">
            <h4 className="text-xs text-gray-400 uppercase font-semibold">Room Facilities</h4>
            <div className="flex flex-wrap gap-2">
              {room.facilities.length > 0 ? (
                room.facilities.map(fac => (
                  <span key={fac.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-50 border border-gray-300 rounded font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-gray-600" />
                    <span>{fac.facility_name}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">Standard Amenities (Wi-Fi, Bed, Fan)</span>
              )}
            </div>
          </div>

          {!showBookingForm && (
            <div className="pt-2">
              {(room.availability_status === 'OCCUPIED' || room.availability_status === 'full' || room.available_beds === 0) ? (
                <button
                  disabled
                  className="w-full py-3 bg-red-50 text-red-700 border border-red-200 font-semibold text-sm uppercase rounded cursor-not-allowed text-center"
                >
                  OCCUPIED
                </button>
              ) : (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full py-3 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded transition-colors"
                >
                  Book Room
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Request Form Panel */}
      {showBookingForm && (
        <div className="bg-white rounded border border-gray-200 shadow-sm p-8 space-y-8 animate-slide-in">
          <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-gray-900">Room Booking Form</h2>
              <p className="text-xs text-gray-500 mt-0.5">Please provide your allocation duration and verification documents.</p>
            </div>
            <button 
              onClick={() => setShowBookingForm(false)}
              className="text-xs text-gray-500 hover:text-black font-semibold hover:underline"
            >
              Cancel Form
            </button>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Section: Personal Info */}
            <div className="space-y-4">
              <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 pb-1">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">First Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.first_name}
                    className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Last Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.last_name}
                    className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    disabled
                    value={user.phone}
                    className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section: Booking Details */}
            <div className="space-y-4">
              <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 pb-1">
                Booking Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Selected Room</label>
                  <input
                    type="text"
                    disabled
                    value={`Room ${room.room_number}`}
                    className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Sharing Type</label>
                  <input
                    type="text"
                    disabled
                    value={room.sharing_type}
                    className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Booking Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Allocation Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                    <option value="5 Months">5 Months</option>
                    <option value="Custom">Custom Duration (specify days)</option>
                  </select>
                </div>

                {duration === 'Custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Specify Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                      placeholder="e.g. 15"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Luggage Handbags/Bags Count</label>
                  <input
                    type="number"
                    min="0"
                    value={bagsCount}
                    onChange={(e) => setBagsCount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Additional Check-in Notes</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="Any preferences or comments regarding luggage, arrival time..."
                />
              </div>
            </div>

            {/* Section: Document Upload */}
            <div className="space-y-4">
              <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 pb-1">
                Identity Documents Verification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="border border-dashed border-gray-300 rounded p-4 text-center hover:border-gray-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto stroke-1" />
                  <p className="text-xs font-bold text-gray-700 mt-2">Aadhaar Card / ID Proof</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">PDF or Image (Max 5MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                    onChange={(e) => handleFileChange(e, 'aadhaar')}
                    className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {aadhaarFile && (
                    <p className="text-xs text-green-600 font-semibold mt-2 truncate flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {aadhaarFile.name}
                    </p>
                  )}
                </div>

                <div className="border border-dashed border-gray-300 rounded p-4 text-center hover:border-gray-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto stroke-1" />
                  <p className="text-xs font-bold text-gray-700 mt-2">Resident Passport Photo</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">JPG, JPEG or PNG (Max 5MB)</p>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    required
                    onChange={(e) => handleFileChange(e, 'photo')}
                    className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {photoFile && (
                    <p className="text-xs text-green-600 font-semibold mt-2 truncate flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {photoFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Terms and Submit */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="terms" className="ml-2 block text-xs text-gray-600 leading-normal">
                  I agree to the PG terms and conditions. I verify that the documents uploaded belong to me and are authentic. I agree that my booking will initially be marked as <span className="font-semibold text-gray-900">PENDING</span> and is subject to administrator clearance.
                </label>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting Booking Request...' : 'Submit Booking Request'}
                </button>
              </div>
            </div>
          </form>
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
