import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../services/api';
import { FileText, Download, Check, X, ShieldAlert, Eye, FileDown } from 'lucide-react';
import Toast from '../components/Toast';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [activeBooking, setActiveBooking] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const location = useLocation();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await API.get('/bookings');
      setBookings(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch booking requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (location.state?.highlightId && bookings.length > 0) {
      const match = bookings.find(b => b.id === location.state.highlightId);
      if (match) {
        setActiveBooking(match);
      }
    }
  }, [location.state, bookings]);

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this booking request?`)) return;

    setSubmittingStatus(true);
    try {
      await API.put(`/bookings/${id}/status`, { status });
      setToast({ 
        type: status === 'APPROVED' ? 'success' : 'warning', 
        message: `Booking request successfully ${status.toLowerCase()}!` 
      });
      setActiveBooking(null);
      fetchBookings();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to update booking status.' });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleDownloadPDF = async (bookingId, roomNumber, firstName, lastName) => {
    setToast({ type: 'info', message: 'Generating PDF...' });
    try {
      const res = await API.get(`/admin/bookings/${bookingId}/download-pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const cleanName = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '');
      link.download = `Amigos_PG_Booking_Form_Room_${roomNumber}_${cleanName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setToast({ type: 'success', message: 'PDF downloaded successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: 'Unable to generate the booking form PDF. Please try again.' });
    }
  };

  const handleDownloadDocument = async (bookingId, docId, docType, originalFilename) => {
    setToast({ type: 'info', message: 'Downloading document...' });
    try {
      const res = await API.get(`/bookings/${bookingId}/documents/${docId}`, {
        responseType: 'blob'
      });
      
      const ext = originalFilename.split('.').pop() || 'jpg';
      const cleanRoom = activeBooking.room?.room_number || 'N-A';
      const cleanUser = `${activeBooking.user?.first_name || 'User'}_${activeBooking.user?.last_name || ''}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      
      const downloadName = docType === 'aadhaar_id' 
        ? `Amigos_PG_Aadhaar_Room_${cleanRoom}_${cleanUser}.${ext}`
        : `Amigos_PG_Passport_Photo_Room_${cleanRoom}_${cleanUser}.${ext}`;
      
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Document downloaded successfully.' });
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message || 'Unable to download the document. Please try again.';
      setToast({ type: 'error', message: errMsg });
    }
  };


  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200'
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded border uppercase tracking-wider ${styles[status] || styles.PENDING}`}>
        {status}
      </span>
    );
  };

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
          BOOKING REQUESTS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review documents, download receipts, and approve room bed allocations.
        </p>
      </div>

      {/* Bookings Ledger */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Allocation Requests Ledger</h3>
          <span className="text-xs text-gray-400">Total: {bookings.length}</span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No booking requests submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50/50 uppercase text-[10px] tracking-wider font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Resident</th>
                  <th className="px-6 py-3">Room Assigned</th>
                  <th className="px-6 py-3">Sharing</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">Date Submitted</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50/30">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {booking.user?.first_name} {booking.user?.last_name}
                      <span className="block text-[10px] text-gray-400 font-normal">{booking.user?.email}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">
                      Room {booking.room?.room_number}
                    </td>
                    <td className="px-6 py-4 capitalize">{booking.room?.sharing_type}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {booking.duration}
                      {booking.duration === 'Custom' && ` (${booking.custom_days} Days)`}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(booking.booking_start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setActiveBooking(booking)}
                        className="p-1.5 border border-gray-300 hover:border-black rounded text-gray-600 hover:text-black transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(booking.id, booking.room?.room_number, booking.user?.first_name, booking.user?.last_name)}
                        className="inline-block p-1.5 border border-gray-300 hover:border-black rounded text-gray-600 hover:text-black transition-all"
                        title="Download Booking PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded border border-gray-300 w-full max-w-2xl shadow-xl animate-slide-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase">Booking Request Details</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">Reference ID: AMPG-{String(activeBooking.id).padStart(4, '0')}</h3>
              </div>
              <button onClick={() => setActiveBooking(null)} className="text-gray-400 hover:text-black uppercase font-bold text-xs">
                Close
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[480px]">
              {/* Personal Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Resident Information</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>Name: <span className="font-bold text-gray-900">{activeBooking.user?.first_name} {activeBooking.user?.last_name}</span></div>
                  <div>Email: <span className="font-bold text-gray-900">{activeBooking.user?.email}</span></div>
                  <div>Phone: <span className="font-bold text-gray-900">{activeBooking.user?.phone}</span></div>
                  <div>Home Location: <span className="font-bold text-gray-900">{activeBooking.user?.city}, {activeBooking.user?.state}</span></div>
                </div>
              </div>

              {/* Room details */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Requested Room Parameters</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>Assigned Room: <span className="font-bold text-gray-900">Room {activeBooking.room?.room_number} ({activeBooking.room?.floor} Floor)</span></div>
                  <div>Sharing configuration: <span className="font-bold text-gray-900">{activeBooking.room?.sharing_type}</span></div>
                  <div>Start check-in date: <span className="font-bold text-gray-900">{new Date(activeBooking.booking_start_date).toLocaleDateString()}</span></div>
                  <div>Duration: <span className="font-bold text-gray-900">{activeBooking.duration} {activeBooking.duration === 'Custom' && `(${activeBooking.custom_days} Days)`}</span></div>
                  <div>Luggage Bags Count: <span className="font-bold text-gray-900">{activeBooking.luggage_bags_count} Bags</span></div>
                  <div>Monthly rent value: <span className="font-bold text-gray-950">INR {activeBooking.room?.monthly_price?.toLocaleString()}</span></div>
                  <div>Security Deposit due: <span className="font-bold text-gray-950">INR {activeBooking.room?.security_deposit?.toLocaleString()}</span></div>
                </div>
                {activeBooking.additional_notes && (
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs mt-1">
                    <span className="font-semibold text-gray-500 uppercase block mb-1">Check-in Remarks:</span>
                    <p className="text-gray-700 leading-normal">{activeBooking.additional_notes}</p>
                  </div>
                )}
              </div>

              {/* Secured Identity documents download */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Verification Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {activeBooking.documents?.map(doc => (
                    <div key={doc.id} className="p-3 bg-gray-50 border border-gray-200 rounded flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800 uppercase tracking-wider">{doc.document_type === 'aadhaar_id' ? 'Aadhaar Card' : 'Passport Photo'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[150px] mt-0.5">{doc.original_filename}</p>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(activeBooking.id, doc.id, doc.document_type, doc.original_filename)}
                        className="p-2 bg-white border border-gray-300 rounded hover:border-black text-gray-600 hover:text-black transition-colors"
                        title="Download Secured File"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms and actions */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold uppercase">
                  <Check className="w-4 h-4" />
                  <span>Terms and Conditions Accepted</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadPDF(activeBooking.id, activeBooking.room?.room_number, activeBooking.user?.first_name, activeBooking.user?.last_name)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-xs font-bold rounded hover:border-black transition-all uppercase tracking-wider"
                  >
                    <FileDown className="w-4 h-4" /> Print Details
                  </button>

                  {activeBooking.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(activeBooking.id, 'REJECTED')}
                        disabled={submittingStatus}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded uppercase tracking-wider transition-colors"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(activeBooking.id, 'APPROVED')}
                        disabled={submittingStatus}
                        className="px-4 py-2 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded uppercase tracking-wider transition-colors"
                      >
                        Approve & Allocate
                      </button>
                    </>
                  )}
                </div>
              </div>
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
    </div>
  );
}
