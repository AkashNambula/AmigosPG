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

  useEffect(() => {
    if (activeBooking) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeBooking]);

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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
          onClick={() => setActiveBooking(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-in"
            style={{ width: 'min(850px, calc(100vw - 40px))', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex-none px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Booking Request Details</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[13px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase tracking-wider">REF: AMPG-{String(activeBooking.id).padStart(4, '0')}</span>
                  {getStatusBadge(activeBooking.status)}
                </div>
              </div>
              <button onClick={() => setActiveBooking(null)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors" title="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-10 bg-white">
              {/* Resident Information */}
              <section>
                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5">Resident Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Name</span>
                    <span className="text-[15px] font-semibold text-gray-900">{activeBooking.user?.first_name} {activeBooking.user?.last_name}</span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Email</span>
                    <a href={`mailto:${activeBooking.user?.email}`} className="text-[15px] font-semibold text-blue-600 hover:underline break-all" style={{ overflowWrap: 'anywhere' }}>{activeBooking.user?.email}</a>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Phone</span>
                    <span className="text-[15px] font-semibold text-gray-900">{activeBooking.user?.phone}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Home Location</span>
                    <span className="text-[15px] font-semibold text-gray-900">{activeBooking.user?.city}, {activeBooking.user?.state}</span>
                  </div>
                </div>
              </section>

              {/* Room & Booking Details */}
              <section>
                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5">Room & Booking Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Assigned Room</span>
                    <span className="text-[15px] font-semibold text-gray-900">Room {activeBooking.room?.room_number}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Floor</span>
                    <span className="text-[15px] font-semibold text-gray-900">{activeBooking.room?.floor}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Sharing</span>
                    <span className="text-[15px] font-semibold text-gray-900 capitalize">{activeBooking.room?.sharing_type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Duration</span>
                    <span className="text-[15px] font-semibold text-gray-900">{activeBooking.duration} {activeBooking.duration === 'Custom' && `(${activeBooking.custom_days} Days)`}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Monthly Rent</span>
                    <span className="text-[15px] font-semibold text-gray-900">₹{activeBooking.room?.monthly_price?.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Security Deposit</span>
                    <span className="text-[15px] font-semibold text-gray-900">₹{activeBooking.room?.security_deposit?.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Start Date</span>
                    <span className="text-[15px] font-semibold text-gray-900">{new Date(activeBooking.booking_start_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-gray-500 mb-1">Submitted</span>
                    <span className="text-[15px] font-semibold text-gray-900">{new Date(activeBooking.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </section>

              {/* Additional Information */}
              {(activeBooking.luggage_bags_count !== undefined || activeBooking.additional_notes) && (
                <section>
                  <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {activeBooking.luggage_bags_count !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-gray-500 mb-1">Luggage Bags Count</span>
                        <span className="text-[15px] font-semibold text-gray-900">{activeBooking.luggage_bags_count}</span>
                      </div>
                    )}
                    {activeBooking.additional_notes && (
                      <div className="flex flex-col md:col-span-2">
                        <span className="text-[13px] font-medium text-gray-500 mb-1">Check-in Remarks</span>
                        <p className="text-[15px] font-semibold text-gray-900 bg-gray-50 p-4 border border-gray-100 rounded leading-relaxed">{activeBooking.additional_notes}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Documents & Receipts */}
              <section>
                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5">Documents & Receipts</h3>
                {activeBooking.documents && activeBooking.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    {activeBooking.documents.map(doc => (
                      <div key={doc.id} className="p-4 bg-white border border-gray-200 shadow-sm rounded-lg flex justify-between items-center group hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 text-gray-600 rounded">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[14px] font-bold text-gray-900">{doc.document_type === 'aadhaar_id' ? 'Aadhaar Card' : 'Passport Photo'}</p>
                            <p className="text-[12px] text-gray-500 truncate" title={doc.original_filename}>{doc.original_filename}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadDocument(activeBooking.id, doc.id, doc.document_type, doc.original_filename)}
                          className="p-2 text-gray-500 hover:text-black bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-center">
                    <p className="text-[14px] text-gray-500">No documents available</p>
                  </div>
                )}
              </section>
            </div>

            {/* Modal Footer / Actions */}
            <div className="flex-none px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => setActiveBooking(null)}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black font-semibold text-[14px] rounded transition-colors w-full sm:w-auto"
              >
                Close
              </button>

              <div className="flex flex-col sm:flex-row gap-3">
                {activeBooking.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(activeBooking.id, 'REJECTED')}
                      disabled={submittingStatus}
                      className="px-6 py-2.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-[14px] font-semibold rounded transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(activeBooking.id, 'APPROVED')}
                      disabled={submittingStatus}
                      className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white text-[14px] font-semibold rounded transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                      Approve & Allocate
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDownloadPDF(activeBooking.id, activeBooking.room?.room_number, activeBooking.user?.first_name, activeBooking.user?.last_name)}
                  className="inline-flex justify-center items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-black text-[14px] font-semibold rounded transition-colors w-full sm:w-auto"
                >
                  <FileDown className="w-4 h-4" /> Print
                </button>
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
