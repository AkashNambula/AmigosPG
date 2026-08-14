import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import API, { getBackendBaseURL } from '../services/api';
import { 
  CreditCard, Plus, HelpCircle, AlertCircle, FileText, 
  CheckCircle2, History, X, Copy, Upload, Download, Check, Image 
} from 'lucide-react';
import Toast from '../components/Toast';

export default function PayBills() {
  const backendBase = getBackendBaseURL();
  const { user } = useAuth();
  const location = useLocation();
  
  const [bills, setBills] = useState([]);
  const [residents, setResidents] = useState([]); // Admin
  const [paymentProofs, setPaymentProofs] = useState([]); // Admin
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form states (Admin Create Bill)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [maintenanceAmount, setMaintenanceAmount] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submittingBill, setSubmittingBill] = useState(false);

  // Admin Payment Settings states
  const [upiIdInput, setUpiIdInput] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    return () => {
      if (qrPreviewUrl) {
        URL.revokeObjectURL(qrPreviewUrl);
      }
    };
  }, [qrPreviewUrl]);

  // Form states (Tenant Pay Bill Modal)
  const [activeBill, setActiveBill] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');
  const [txnId, setTxnId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submittingPay, setSubmittingPay] = useState(false);

  // Detail Modal (Admin view & verify submitted payments)
  const [activeProof, setActiveProof] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchBillsAndData = async () => {
    try {
      setLoading(true);
      const billsRes = await API.get('/bills');
      setBills(billsRes.data);
      
      const settingsRes = await API.get('/bills/settings');
      setPaymentSettings(settingsRes.data);
      if (settingsRes.data) {
        setUpiIdInput(settingsRes.data.upi_id || '');
      }

      if (user.role === 'admin') {
        const residentsRes = await API.get('/users?role=tenant&status=active');
        setResidents(residentsRes.data);
        
        const proofsRes = await API.get('/bills/proofs/all');
        setPaymentProofs(proofsRes.data);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load billing ledger.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillsAndData();
  }, [user]);

  // Handle click outside / navigation state matching
  useEffect(() => {
    if (location.state?.highlightId && bills.length > 0) {
      const match = bills.find(b => b.id === location.state.highlightId);
      if (match) {
        if (user.role === 'admin') {
          // If there is an associated payment proof, show it
          if (match.payments && match.payments.length > 0) {
            const activePay = match.payments[match.payments.length - 1];
            if (activePay.screenshot_path) {
              setActiveProof(activePay);
            }
          }
        } else {
          setActiveBill(match);
        }
      }
    }
  }, [location.state, bills, user]);

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !dueDate) {
      setToast({ type: 'error', message: 'Please select a resident and due date.' });
      return;
    }

    setSubmittingBill(true);
    try {
      await API.post('/bills', {
        user_id: parseInt(selectedUserId),
        rent_amount: parseFloat(rentAmount || 0),
        electricity_amount: parseFloat(electricityAmount || 0),
        food_amount: parseFloat(foodAmount || 0),
        maintenance_amount: parseFloat(maintenanceAmount || 0),
        other_amount: parseFloat(otherAmount || 0),
        due_date: new Date(dueDate).toISOString()
      });

      setToast({ type: 'success', message: 'Invoice bill generated successfully.' });
      setShowCreateForm(false);
      setSelectedUserId('');
      setRentAmount('');
      setElectricityAmount('');
      setFoodAmount('');
      setMaintenanceAmount('');
      setOtherAmount('');
      setDueDate('');
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to generate bill.' });
    } finally {
      setSubmittingBill(false);
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    const cleanUpi = upiIdInput.replace(/\s+/g, '');
    if (!cleanUpi || cleanUpi.indexOf("@") === -1 || cleanUpi.split("@").length !== 2 || !cleanUpi.split("@")[0] || !cleanUpi.split("@")[1]) {
      setToast({ type: 'error', message: 'Please enter a valid UPI ID.' });
      return;
    }

    setSavingSettings(true);
    try {
      // 1. Update UPI ID
      const upiFormData = new FormData();
      upiFormData.append('upi_id', cleanUpi);
      await API.put('/bills/settings', upiFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 2. Upload QR scanner file if specified
      if (qrFile) {
        const qrFormData = new FormData();
        qrFormData.append('qr_file', qrFile);
        await API.post('/bills/settings/qr', qrFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setQrFile(null);
        if (qrPreviewUrl) {
          URL.revokeObjectURL(qrPreviewUrl);
          setQrPreviewUrl('');
        }
      }

      setToast({ type: 'success', message: 'Payment settings updated successfully.' });
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to update payment settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveQrCode = async () => {
    if (!window.confirm("Are you sure you want to remove the QR Code?")) return;
    try {
      await API.delete('/bills/settings/qr');
      if (qrPreviewUrl) {
        URL.revokeObjectURL(qrPreviewUrl);
        setQrPreviewUrl('');
      }
      setQrFile(null);
      setToast({ type: 'success', message: 'QR Code removed successfully.' });
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to remove QR Code.' });
    }
  };

  const handleCopyUpiId = () => {
    if (paymentSettings?.upi_id) {
      navigator.clipboard.writeText(paymentSettings.upi_id);
      setToast({ type: 'success', message: 'UPI ID copied successfully.' });
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setToast({ type: 'error', message: 'Please upload a valid payment screenshot under 5 MB.' });
      e.target.value = '';
      setScreenshotFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Please upload a valid payment screenshot under 5 MB.' });
      e.target.value = '';
      setScreenshotFile(null);
      return;
    }

    setScreenshotFile(file);
  };

  const handlePayProofSubmit = async (e) => {
    e.preventDefault();
    if (!txnId.trim()) {
      setToast({ type: 'error', message: 'UTR / Reference Number is required.' });
      return;
    }
    if (!screenshotFile) {
      setToast({ type: 'error', message: 'Payment screenshot is required.' });
      return;
    }

    setSubmittingPay(true);
    try {
      const formData = new FormData();
      formData.append('amount_paid', activeBill.total_amount);
      formData.append('payment_method', payMethod);
      formData.append('transaction_id', txnId.trim());
      formData.append('payment_date', payDate);
      formData.append('screenshot', screenshotFile);

      await API.post(`/bills/${activeBill.id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setToast({ type: 'success', message: 'Payment proof submitted successfully!' });
      setActiveBill(null);
      setTxnId('');
      setScreenshotFile(null);
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to submit payment proof.' });
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleStatusUpdateAction = async (statusVal) => {
    if (!window.confirm(`Are you sure you want to mark this payment as ${statusVal}?`)) return;

    setProcessingPayment(true);
    try {
      const formData = new FormData();
      formData.append('status_update', statusVal);
      if (adminNotes.trim()) {
        formData.append('admin_notes', adminNotes);
      }

      await API.patch(`/bills/proofs/${activeProof.id}/status`, formData);
      setToast({ type: 'success', message: `Payment proof marked as ${statusVal}!` });
      setActiveProof(null);
      setAdminNotes('');
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update payment proof status.' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDownloadScreenshot = async (payId, originalPath) => {
    setToast({ type: 'info', message: 'Downloading screenshot...' });
    try {
      const res = await API.get(`/bills/proofs/${payId}/download`, {
        responseType: 'blob'
      });
      const ext = originalPath.split('.').pop() || 'jpg';
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Amigos_PG_Payment_Screenshot_${payId}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Screenshot downloaded successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: 'Unable to download the document. Please try again.' });
    }
  };

  const getBillPaymentStatus = (bill) => {
    if (bill.status === 'PAID') return 'PAID';
    if (bill.payments && bill.payments.length > 0) {
      const activePay = bill.payments[bill.payments.length - 1];
      if (activePay.status === 'PENDING') return 'PENDING VERIFICATION';
      return activePay.status; // 'RECEIVED', 'FAILED'
    }
    return 'UNPAID';
  };

  const getPaymentStatusColor = (status) => {
    const styles = {
      'PAID': 'bg-green-50 text-green-700 border-green-200',
      'SUCCESS': 'bg-green-50 text-green-700 border-green-200',
      'PENDING VERIFICATION': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'PENDING': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'RECEIVED': 'bg-blue-50 text-blue-700 border-blue-200',
      'FAILED': 'bg-red-50 text-red-700 border-red-200',
      'UNPAID': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return styles[status] || styles.UNPAID;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Title Header */}
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            BILLS & PAYMENTS
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.role === 'admin' 
              ? 'Configure payment accounts, verify submitted proof screenshots, and settle ledgers.' 
              : 'View rent invoices, settle pending payments, and check clearance history.'}
          </p>
        </div>
        
        {user.role === 'admin' && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Bill
          </button>
        )}
      </div>

      {/* Admin: Create Bill Form */}
      {showCreateForm && user.role === 'admin' && (
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6 animate-slide-in">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase">Generate New Resident Invoice</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-xs text-gray-400 hover:text-black font-semibold hover:underline">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateBill} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Select Active Resident</label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
              >
                <option value="">-- Select Resident --</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.first_name} {r.last_name} ({r.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Monthly Rent (INR)</label>
              <input
                type="number"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Electricity Charges (INR)</label>
              <input
                type="number"
                value={electricityAmount}
                onChange={(e) => setElectricityAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Food Charges (INR)</label>
              <input
                type="number"
                value={foodAmount}
                onChange={(e) => setFoodAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Maintenance Charges (INR)</label>
              <input
                type="number"
                value={maintenanceAmount}
                onChange={(e) => setMaintenanceAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase">Other Charges (INR)</label>
              <input
                type="number"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submittingBill}
                className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded shadow-sm disabled:opacity-50 transition-colors"
              >
                {submittingBill ? 'Generating...' : 'Submit Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin: Payment Settings section */}
      {user.role === 'admin' && (
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Payment Settings</h3>
          </div>
          
          <form onSubmit={handleSavePaymentSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">UPI ID</label>
                <input
                  type="text"
                  required
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value.replace(/\s+/g, ''))}
                  placeholder="e.g. amigospg@upi"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Upload QR Code / Scanner Image</label>
                <div className="mt-1 flex items-center gap-4">
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded hover:border-black cursor-pointer text-xs font-semibold bg-white">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setQrFile(file);
                          setQrPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {qrFile && <span className="text-xs text-gray-600 font-mono truncate max-w-[200px]">{qrFile.name}</span>}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 bg-black hover:bg-gray-900 text-white text-xs font-semibold uppercase rounded transition-colors"
                >
                  {savingSettings ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="flex flex-col items-center justify-center border border-gray-150 rounded bg-gray-50/50 p-4 min-h-[150px]">
              {(qrPreviewUrl || paymentSettings?.qr_code_path) ? (
                <div className="text-center space-y-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    {qrPreviewUrl ? 'Selected Preview' : 'Active QR Code Preview'}
                  </p>
                  <img
                    src={qrPreviewUrl || `${backendBase}${paymentSettings.qr_code_path}`}
                    alt="Active QR code scanner"
                    className="w-32 h-32 object-contain bg-white p-2 border border-gray-200 rounded mx-auto"
                  />
                  {(paymentSettings?.qr_code_path || qrFile) && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (qrFile) {
                          setQrFile(null);
                          if (qrPreviewUrl) {
                            URL.revokeObjectURL(qrPreviewUrl);
                            setQrPreviewUrl('');
                          }
                        } else {
                          await handleRemoveQrCode();
                        }
                      }}
                      className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 tracking-wider"
                    >
                      Remove QR Code
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 space-y-1">
                  <Image className="w-12 h-12 stroke-1 mx-auto text-gray-300" />
                  <p className="text-[10px] uppercase font-bold tracking-wider">No QR Scanner Uploaded</p>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Admin: Payment Verification Ledger */}
      {user.role === 'admin' && (
        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Payment Verification</h3>
          </div>

          {paymentProofs.length === 0 ? (
            <div className="text-center p-8 text-xs text-gray-400 italic">No submitted payment proofs found in system.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-250 border border-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Resident</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Method</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">UTR / Reference</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Submitted Date</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 bg-white">
                  {paymentProofs.map((proof) => (
                    <tr key={proof.id}>
                      <td className="px-4 py-3.5 font-semibold text-gray-900">
                        {proof.bill?.user?.first_name} {proof.bill?.user?.last_name}
                      </td>
                      <td className="px-4 py-3.5 uppercase font-medium text-gray-600">{proof.payment_method}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">INR {proof.amount_paid?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-mono text-gray-500">{proof.transaction_id || 'N/A'}</td>
                      <td className="px-4 py-3.5 text-gray-500">{new Date(proof.submitted_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusColor(proof.status === 'PENDING' ? 'PENDING VERIFICATION' : proof.status)}`}>
                          {proof.status === 'PENDING' ? 'PENDING VERIFICATION' : proof.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setActiveProof(proof);
                            setAdminNotes(proof.admin_notes || '');
                          }}
                          className="px-2.5 py-1 border border-gray-300 rounded text-xs font-semibold hover:border-black transition-colors"
                        >
                          View Proof
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ledger Bills Table (General list of bills for either Admin or Tenant) */}
      <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Billing History Ledger</h3>
        </div>

        {bills.length === 0 ? (
          <div className="text-center p-8 text-xs text-gray-400 italic">No bill history found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-250 border border-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Invoice</th>
                  {user.role === 'admin' && (
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Resident</th>
                  )}
                  <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Breakdown Total</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Payment Status</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {bills.map((bill) => {
                  const billStatus = getBillPaymentStatus(bill);
                  return (
                    <tr key={bill.id}>
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-900">AMPG-B{String(bill.id).padStart(3, '0')}</td>
                      {user.role === 'admin' && (
                        <td className="px-4 py-3.5 text-gray-600 font-semibold">{bill.user?.first_name} {bill.user?.last_name}</td>
                      )}
                      <td className="px-4 py-3.5 font-bold text-gray-950">INR {bill.total_amount?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-gray-500">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusColor(billStatus)}`}>
                          {billStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {user.role === 'tenant' && bill.status !== 'PAID' && billStatus !== 'PENDING VERIFICATION' && billStatus !== 'RECEIVED' && (
                          <button
                            onClick={() => setActiveBill(bill)}
                            className="px-3 py-1 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded uppercase tracking-wider transition-colors"
                          >
                            Pay Bill
                          </button>
                        )}
                        {user.role === 'tenant' && (billStatus === 'PENDING VERIFICATION' || billStatus === 'RECEIVED' || bill.status === 'PAID') && (
                          <span className="text-gray-400 italic text-[11px] font-medium">In Ledger</span>
                        )}
                        {user.role === 'admin' && (
                          <button
                            onClick={() => {
                              // If ledger has payment proof, view details
                              const matchProof = bill.payments && bill.payments.length > 0 ? bill.payments[bill.payments.length - 1] : null;
                              if (matchProof && matchProof.screenshot_path) {
                                setActiveProof(matchProof);
                                setAdminNotes(matchProof.admin_notes || '');
                              } else {
                                setToast({ type: 'info', message: 'No digital payment proof submitted for this bill yet.' });
                              }
                            }}
                            className="px-2.5 py-1 border border-gray-300 rounded text-xs font-semibold hover:border-black transition-colors"
                          >
                            Ledger History
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tenant: Pay Bill Modal */}
      {activeBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded border border-gray-350 w-full max-w-lg shadow-2xl animate-slide-in my-8">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Billing Settle</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">Invoice AMPG-B{String(activeBill.id).padStart(3, '0')}</h3>
              </div>
              <button onClick={() => {
                setActiveBill(null);
                setTxnId('');
                setScreenshotFile(null);
              }} className="text-gray-400 hover:text-black uppercase font-bold text-xs">
                Close
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
              {/* Due Breakdowns */}
              <div className="bg-gray-50 p-4 border border-gray-200 rounded text-xs grid grid-cols-2 gap-2">
                <div>Rent Amount: <span className="font-semibold text-gray-900">₹{activeBill.rent_amount}</span></div>
                <div>Electricity amount: <span className="font-semibold text-gray-900">₹{activeBill.electricity_amount}</span></div>
                <div>Food Board bill: <span className="font-semibold text-gray-900">₹{activeBill.food_amount}</span></div>
                <div>Maintenance/Other: <span className="font-semibold text-gray-900">₹{activeBill.maintenance_amount + activeBill.other_amount}</span></div>
                <div className="col-span-2 border-t border-gray-250 pt-2 flex justify-between text-sm font-bold text-gray-950">
                  <span>Total Amount Due:</span>
                  <span>₹{activeBill.total_amount?.toLocaleString()}</span>
                </div>
              </div>

              {/* UPI & QR scanner display */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">UPI / QR Payment Instructions</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* UPI Details */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded flex flex-col justify-center space-y-2">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Direct UPI Settle</p>
                    <p className="text-xs font-mono font-bold text-gray-900 bg-white px-2.5 py-1.5 border border-gray-150 rounded text-center truncate">
                      {paymentSettings?.upi_id || 'amigospg@upi'}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded hover:border-black transition-all bg-white"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>Copy UPI ID</span>
                    </button>
                  </div>

                  {/* QR scanner Code */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center min-h-[120px]">
                    {paymentSettings?.qr_code_path ? (
                      <div className="text-center space-y-1">
                        <img
                          src={`${backendBase}${paymentSettings.qr_code_path}`}
                          alt="Amigos QR scanner"
                          className="w-24 h-24 object-contain bg-white border border-gray-100 rounded"
                        />
                        <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">Amigos Mens Luxury PG</span>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        <Image className="w-8 h-8 stroke-1 mx-auto text-gray-300" />
                        <p className="text-[8px] uppercase font-bold tracking-wider mt-1">No QR Code Available</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded text-[11px] text-gray-600 space-y-1">
                  <p className="font-bold text-yellow-800 uppercase tracking-wider mb-1">How to pay:</p>
                  <p>1. Scan the QR code or use the copied UPI ID.</p>
                  <p>2. Settle the billing due (₹{activeBill.total_amount?.toLocaleString()}) using any UPI app.</p>
                  <p>3. Capture the successful payment transaction screenshot.</p>
                  <p>4. Upload the screenshot below, enter payment details and submit.</p>
                </div>
              </div>

              {/* Upload payment proof form */}
              <form onSubmit={handlePayProofSubmit} className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Upload Verification Proof</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Payment Mode</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                    >
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Net Banking">Net Banking / NEFT</option>
                      <option value="Cash">Cash to Owner</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">UPI Reference / UTR Number</label>
                  <input
                    type="text"
                    required
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="e.g. 12-digit transaction number"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Upload Payment Screenshot (JPG, PNG, WEBP)</label>
                  <div className="mt-1.5 flex items-center gap-4">
                    <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded hover:border-black cursor-pointer text-xs font-semibold bg-white">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span>Choose Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotChange}
                      />
                    </label>
                    {screenshotFile && <span className="text-xs text-gray-600 font-mono truncate max-w-[200px]">{screenshotFile.name}</span>}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingPay}
                    className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {submittingPay ? 'Submitting Proof...' : 'Submit Payment Proof'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin: View Payment Proof Verification details Modal */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded border border-gray-350 w-full max-w-lg shadow-2xl animate-slide-in my-8">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Verify Submission</span>
                <h3 className="text-md font-bold text-gray-900 mt-0.5">Proof Verification (Bill ID #{activeProof.bill_id})</h3>
              </div>
              <button onClick={() => {
                setActiveProof(null);
                setAdminNotes('');
              }} className="text-gray-400 hover:text-black uppercase font-bold text-xs">
                Close
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[500px]">
              {/* Submission details */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-100 pb-4">
                <div>Resident: <span className="font-bold text-gray-900">{activeProof.bill?.user?.first_name} {activeProof.bill?.user?.last_name}</span></div>
                <div>Submitted Amount: <span className="font-bold text-gray-950">INR {activeProof.amount_paid?.toLocaleString()}</span></div>
                <div>UTR / Transaction ID: <span className="font-mono font-bold text-gray-900 bg-gray-50 px-1 py-0.5 rounded border border-gray-200">{activeProof.transaction_id || 'N/A'}</span></div>
                <div>Payment Mode: <span className="font-bold text-gray-900 uppercase">{activeProof.payment_method}</span></div>
                <div>Payment Date: <span className="font-semibold text-gray-800">{new Date(activeProof.payment_date).toLocaleDateString()}</span></div>
                <div>Submission Date: <span className="font-semibold text-gray-800">{new Date(activeProof.submitted_at).toLocaleDateString()}</span></div>
                <div className="col-span-2">
                  Verification Status: 
                  <span className={`ml-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusColor(activeProof.status === 'PENDING' ? 'PENDING VERIFICATION' : activeProof.status)}`}>
                    {activeProof.status === 'PENDING' ? 'PENDING VERIFICATION' : activeProof.status}
                  </span>
                </div>
              </div>

              {/* Screenshot display and download */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Screenshot</h4>
                  <button
                    onClick={() => handleDownloadScreenshot(activeProof.id, activeProof.screenshot_path)}
                    className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 hover:text-black hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Image
                  </button>
                </div>
                <div className="border border-gray-200 rounded p-2 bg-gray-50 text-center">
                  <img
                    src={`${backendBase}/api/bills/proofs/${activeProof.id}/download`}
                    alt="Payment screenshot proof"
                    className="max-h-60 object-contain mx-auto rounded bg-white shadow-sm"
                    onError={(e) => {
                      // fallback if image request fails
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Verification Notes / Remarks</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Transaction matches banking statements, or Reference number is invalid."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-black focus:border-black text-xs h-16 bg-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              {activeProof.status !== 'SUCCESS' && user.role === 'admin' && (
                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={() => handleStatusUpdateAction('FAILED')}
                    disabled={processingPayment}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs font-bold uppercase rounded tracking-wider transition-colors"
                  >
                    Mark Failed
                  </button>
                  <button
                    onClick={() => handleStatusUpdateAction('RECEIVED')}
                    disabled={processingPayment}
                    className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-bold uppercase rounded tracking-wider transition-colors"
                  >
                    Mark Received
                  </button>
                  <button
                    onClick={() => handleStatusUpdateAction('SUCCESS')}
                    disabled={processingPayment}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase rounded tracking-wider transition-colors"
                  >
                    Mark Success
                  </button>
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
