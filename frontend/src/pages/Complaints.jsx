import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getBackendBaseURL } from '../services/api';
import { AlertCircle, Plus, FileText, CheckCircle2, MessageSquare, Upload, X } from 'lucide-react';
import Toast from '../components/Toast';

export default function Complaints() {
  const backendBase = getBackendBaseURL();
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState(null);

  // Form states (Tenant)
  const [category, setCategory] = useState('Maintenance');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('LOW');
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal & Response states (Admin or Tenant viewing comments)
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const location = useLocation();

  const categories = ['Electricity', 'Water', 'Wi-Fi', 'Cleaning', 'Food', 'Room', 'Bathroom', 'Maintenance', 'Other'];

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await API.get('/complaints');
      setComplaints(res.data);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load complaints.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (location.state?.highlightId && complaints.length > 0) {
      const match = complaints.find(c => c.id === location.state.highlightId);
      if (match) {
        setActiveComplaint(match);
        setUpdateStatus(match.status);
      }
    }
  }, [location.state, complaints]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Attachment must be less than 5MB.' });
      e.target.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setToast({ type: 'error', message: 'Only images (JPG, PNG) are allowed.' });
      e.target.value = '';
      return;
    }

    setAttachment(file);
  };

  const handleAddComplaint = async (e) => {
    e.preventDefault();
    if (!subject || !description) {
      setToast({ type: 'error', message: 'Subject and description are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('priority', priority);
      if (attachment) {
        formData.append('file', attachment);
      }

      await API.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setToast({ type: 'success', message: 'Complaint registered successfully.' });
      setShowAddForm(false);
      setSubject('');
      setDescription('');
      setAttachment(null);
      fetchComplaints();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to submit complaint. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    if (!replyMessage || !updateStatus) {
      setToast({ type: 'error', message: 'Response message and status are required.' });
      return;
    }

    setUpdating(true);
    try {
      await API.put(`/complaints/${activeComplaint.id}/status`, {
        status: updateStatus,
        response_message: replyMessage
      });
      setToast({ type: 'success', message: 'Complaint status updated successfully.' });
      setReplyMessage('');
      setActiveComplaint(null);
      fetchComplaints();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update complaint status.' });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      OPEN: 'bg-red-50 text-red-700 border-red-200',
      IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      RESOLVED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded border uppercase ${styles[status] || styles.OPEN}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (prio) => {
    const styles = {
      LOW: 'text-gray-500 bg-gray-100',
      MEDIUM: 'text-yellow-600 bg-yellow-50',
      HIGH: 'text-red-600 bg-red-50 font-semibold'
    };
    return (
      <span className={`px-1.5 py-0.5 text-[10px] rounded uppercase ${styles[prio] || styles.LOW}`}>
        {prio}
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            COMPLAINTS MANAGEMENT
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.role === 'admin' 
              ? 'View and resolve grievances raised by residents.' 
              : 'File complaints regarding PG amenities and track resolution comments.'}
          </p>
        </div>
        
        {user.role === 'tenant' && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" /> Raise Complaint
          </button>
        )}
      </div>

      {/* Raise Complaint Form (Tenant) */}
      {showAddForm && user.role === 'tenant' && (
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6 animate-slide-in">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h3 className="text-md font-bold uppercase">Raise a New Complaint</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-black" title="Cancel">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddComplaint} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Priority level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="e.g. Wi-Fi connection down on 2nd floor"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Detailed Description</label>
              <textarea
                rows="4"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Explain the issue in detail..."
              />
            </div>

            {/* Optional Image Attachment */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Optional Photo Attachment</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-xs font-medium cursor-pointer bg-white hover:bg-gray-50">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span>Choose Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {attachment && (
                  <span className="text-xs text-green-600 font-medium truncate max-w-xs">{attachment.name}</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complaints List Table/Cards */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Active & Past Complaints</h3>
          <span className="text-xs text-gray-400">Total: {complaints.length}</span>
        </div>

        {complaints.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No complaints found.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {complaints.map((comp) => (
              <div key={comp.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{comp.category}</span>
                    {getPriorityBadge(comp.priority)}
                    {getStatusBadge(comp.status)}
                    <span className="text-xs text-gray-400">AMPG-C{String(comp.id).padStart(3, '0')}</span>
                  </div>
                  
                  <h4 className="text-base font-bold text-gray-900">{comp.subject}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">{comp.description}</p>
                  
                  <div className="flex gap-4 text-[10px] text-gray-400">
                    <span>Filed: {new Date(comp.created_at).toLocaleDateString()}</span>
                    {user.role === 'admin' && (
                      <span className="font-semibold text-gray-700">Resident: {comp.user?.first_name} {comp.user?.last_name} (Room {comp.user?.bookings?.find(b => b.status === 'APPROVED')?.room?.room_number || 'Unallocated'})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveComplaint(comp);
                      setUpdateStatus(comp.status);
                    }}
                    className="px-4 py-2 border border-gray-300 text-xs font-semibold rounded hover:border-black hover:bg-gray-50 transition-colors uppercase tracking-wider"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded border border-gray-300 w-full max-w-2xl shadow-xl animate-slide-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{activeComplaint.category} Complaint</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">AMPG-C{String(activeComplaint.id).padStart(3, '0')}</h3>
              </div>
              <button 
                onClick={() => {
                  setActiveComplaint(null);
                  setReplyMessage('');
                }} 
                className="text-gray-400 hover:text-black"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[450px]">
              {/* Main grievances */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Date: {new Date(activeComplaint.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    {getPriorityBadge(activeComplaint.priority)}
                    {getStatusBadge(activeComplaint.status)}
                  </div>
                </div>

                <h4 className="text-md font-bold text-gray-900">{activeComplaint.subject}</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{activeComplaint.description}</p>
                
                {/* Resident Details (Admin only) */}
                {user.role === 'admin' && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                    <p className="font-semibold text-gray-800">Submitted By:</p>
                    <p>{activeComplaint.user?.first_name} {activeComplaint.user?.last_name} ({activeComplaint.user?.email})</p>
                    <p>Phone: {activeComplaint.user?.phone}</p>
                  </div>
                )}

                {/* Optional Image attachment */}
                {activeComplaint.attachment_path && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo Attachment:</p>
                    <img 
                      src={`${backendBase}${activeComplaint.attachment_path}`} 
                      alt="Attachment" 
                      className="max-h-64 object-contain rounded border border-gray-200"
                    />
                  </div>
                )}
              </div>

              {/* Status Log & Response Comments */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resolution History & Replies</h4>
                
                {activeComplaint.updates.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No responses recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeComplaint.updates.map((up) => (
                      <div key={up.id} className="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
                        <div className="flex justify-between items-center text-gray-400 mb-1">
                          <span className="font-semibold text-gray-700">Administrator Response</span>
                          <span>{new Date(up.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-800 mt-1 whitespace-pre-wrap">{up.response_message}</p>
                        <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase">
                          Status updated to: {up.status_change.split(' -> ')[1]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Resolve / Reply Action Form */}
              {user.role === 'admin' && (
                <form onSubmit={handleAdminUpdate} className="space-y-4 pt-6 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-6 rounded-b">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Update Grievance Status</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase">Set Status</label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Response Comment / Remark</label>
                    <textarea
                      rows="3"
                      required
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                      placeholder="Specify corrective actions taken or comments for the resident..."
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full py-2 bg-black hover:bg-gray-900 text-white font-semibold text-xs uppercase rounded transition-colors"
                    >
                      {updating ? 'Submitting Status Change...' : 'Update status & Notify Tenant'}
                    </button>
                  </div>
                </form>
              )}
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
