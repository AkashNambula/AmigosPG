import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getBackendBaseURL } from '../services/api';
import { ShieldAlert, Plus, FileText, CheckCircle2, History, X, Download, ShieldCheck } from 'lucide-react';
import Toast from '../components/Toast';

export default function ProblemsWithPersons() {
  const backendBase = getBackendBaseURL();
  const { user } = useAuth();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form states (Tenant Submit Report)
  const [targetName, setTargetName] = useState('');
  const [targetRoom, setTargetRoom] = useState('');
  const [category, setCategory] = useState('Roommate issue');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal (Admin check details)
  const [activeReport, setActiveReport] = useState(null);
  const location = useLocation();

  const fetchReports = async () => {
    try {
      setLoading(true);
      if (user.role === 'admin') {
        const res = await API.get('/problems');
        setReports(res.data);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load report ledger.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  useEffect(() => {
    if (location.state?.highlightId && reports.length > 0) {
      const match = reports.find(r => r.id === location.state.highlightId);
      if (match) {
        setActiveReport(match);
      }
    }
  }, [location.state, reports]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Attachment must be less than 5MB.' });
      e.target.value = '';
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setToast({ type: 'error', message: 'Allowed attachment: PDF, JPG, PNG.' });
      e.target.value = '';
      return;
    }

    setAttachment(file);
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!targetName || !targetRoom || !description) {
      setToast({ type: 'error', message: 'Please specify target person/room and detail descriptions.' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('target_person_name', targetName);
      formData.append('target_room_number', targetRoom);
      formData.append('category', category);
      formData.append('description', description);
      if (attachment) {
        formData.append('file', attachment);
      }

      await API.post('/problems', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setToast({ type: 'success', message: 'Confidential peer report filed successfully.' });
      setTargetName('');
      setTargetRoom('');
      setDescription('');
      setAttachment(null);
      e.target.reset(); // Clear file input
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to register report.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (user.role === 'admin' && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          PROBLEMS WITH PERSONS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.role === 'admin' 
            ? 'Review and manage peer/roommate issues filed confidentially by residents.' 
            : 'Confidentially report issues regarding roommates or other PG residents to administration.'}
        </p>
      </div>

      {user.role === 'tenant' ? (
        /* Tenant Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-md font-bold uppercase tracking-tight">Confidential Peer Report Form</h3>
            
            <form onSubmit={handleAddReport} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Target Person Name</label>
                  <input
                    type="text"
                    required
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Target Room Number</label>
                  <input
                    type="text"
                    required
                    value={targetRoom}
                    onChange={(e) => setTargetRoom(e.target.value)}
                    placeholder="e.g. 101"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                >
                  <option value="Noise">Noise / High Volume</option>
                  <option value="Cleanliness">Cleanliness / Room Hygiene</option>
                  <option value="Roommate issue">Roommate Dispute</option>
                  <option value="Misbehavior">Misbehavior / Raging / Fight</option>
                  <option value="Disturbance">Disturbance / Guest Issues</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Detailed Description</label>
                <textarea
                  rows="4"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="Provide precise details of the occurrence (dates, times, context)..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Optional Evidence Attachment</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded transition-colors"
                >
                  {submitting ? 'Filing Confidential Report...' : 'File Confidential Report'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-gray-100 p-6 rounded border border-gray-200 space-y-4">
            <div className="flex gap-2 items-center text-gray-800">
              <ShieldCheck className="w-6 h-6 stroke-1.5" />
              <h4 className="font-bold text-sm uppercase">Confidentiality Guarantee</h4>
            </div>
            
            <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
              <p>
                All "Problems with Persons" reports are sent directly and exclusively to the PG Admin owner database.
              </p>
              <p>
                These reports are **NEVER** visible to other roommates, tenants, or users. They are stored securely for internal mediation purposes.
              </p>
              <p>
                Our administrators will evaluate the complaint discreetly and contact you if further evidence is required.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Admin View (Database Ledger) */
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Confidential Reports Database</h3>
            <span className="text-xs text-gray-400">Total reports: {reports.length}</span>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No peer problem reports currently filed in database.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reports.map((rep) => (
                <div key={rep.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 uppercase border border-red-200">
                        {rep.category}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">AMPG-PPR{String(rep.id).padStart(3, '0')}</span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900">
                      Target: <span className="underline">{rep.target_person_name}</span> (Room {rep.target_room_number})
                    </h4>
                    
                    <p className="text-xs text-gray-600 line-clamp-2">{rep.description}</p>
                    
                    <div className="flex gap-4 text-[10px] text-gray-400 pt-1">
                      <span>Reporter ID: {rep.reporter?.first_name} {rep.reporter?.last_name} ({rep.reporter?.email})</span>
                      <span>Filed: {new Date(rep.report_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rep.attachment_path && (
                      <a
                        href={`${backendBase}/api/problems/${rep.id}/attachment`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-gray-300 text-gray-600 hover:text-black hover:border-black rounded transition-colors"
                        title="Download Attachment"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setActiveReport(rep)}
                      className="px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded hover:border-black hover:bg-gray-50 uppercase tracking-wider"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin detail drawer */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 w-full max-w-lg shadow-xl animate-slide-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <span className="text-xs text-gray-400 uppercase font-bold">Confidential Grievance Record</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">AMPG-PPR{String(activeReport.id).padStart(3, '0')}</h3>
              </div>
              <button onClick={() => setActiveReport(null)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><span className="text-gray-400 font-semibold uppercase">Reporter:</span> <span className="font-bold text-gray-900">{activeReport.reporter?.first_name} {activeReport.reporter?.last_name} ({activeReport.reporter?.email})</span></div>
                <div><span className="text-gray-400 font-semibold uppercase">Reporter Phone:</span> <span className="text-gray-700">{activeReport.reporter?.phone}</span></div>
                <div><span className="text-gray-400 font-semibold uppercase">Accused Person:</span> <span className="font-bold text-red-600">{activeReport.target_person_name}</span></div>
                <div><span className="text-gray-400 font-semibold uppercase">Accused Room:</span> <span className="font-bold text-gray-900">Room {activeReport.target_room_number}</span></div>
                <div><span className="text-gray-400 font-semibold uppercase">Category:</span> <span className="font-semibold">{activeReport.category}</span></div>
                <div><span className="text-gray-400 font-semibold uppercase">Date Filed:</span> <span>{new Date(activeReport.report_date).toLocaleDateString()}</span></div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-1">
                <span className="text-xs text-gray-400 font-semibold uppercase">Report Narrative / Details</span>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{activeReport.description}</p>
              </div>

              {activeReport.attachment_path && (
                <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold uppercase">Secure File Attachment Attached</span>
                  <a
                    href={`${backendBase}/api/problems/${activeReport.id}/attachment`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white hover:bg-gray-900 rounded font-semibold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Secure File
                  </a>
                </div>
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
