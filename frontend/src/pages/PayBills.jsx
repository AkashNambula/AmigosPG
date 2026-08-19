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
  
  // State for fetched secure QR blob
  const [activeQrUrl, setActiveQrUrl] = useState('');
  
  // Payment Verification Modal States
  const [activeProofScreenshotUrl, setActiveProofScreenshotUrl] = useState('');
  const [confirmStatusUpdate, setConfirmStatusUpdate] = useState(null); // 'SUCCESS' | 'FAILED' | 'RECEIVED'



  const fetchBillsAndData = async () => {
    try {
      setLoading(true);
      const billsRes = await API.get('/bills');
      const fetchedBills = billsRes.data;
      setBills(fetchedBills);
      

      const settingsRes = await API.get('/bills/settings');
      setPaymentSettings(settingsRes.data);
      if (settingsRes.data) {
        setUpiIdInput(settingsRes.data.upi_id || '');
        if (settingsRes.data.qr_code_path) {
          try {
            const qrRes = await API.get('/bills/settings/qr/download', { responseType: 'blob' });
            setActiveQrUrl(URL.createObjectURL(qrRes.data));
          } catch (e) {
            console.error("Failed to fetch secure QR code", e);
          }
        } else {
            setActiveQrUrl('');
        }
      }


      if (user.role === 'admin') {
        const residentsRes = await API.get('/users?role=tenant&status=active');
        setResidents(residentsRes.data);
        
        const proofsRes = await API.get('/bills/proofs/all');
        setPaymentProofs(proofsRes.data);
      } else if (user.role === 'tenant') {
        // Find the current active bill for the tenant
        // A bill is active if it's UNPAID, or if the latest payment is PENDING/FAILED.
        // Sort by due date descending, but prefer UNPAID/PENDING ones over PAID ones.
        const pendingOrUnpaid = fetchedBills.filter(b => b.status !== 'PAID');
        if (pendingOrUnpaid.length > 0) {
          // just take the first one (assuming sorted by due date by backend)
          setActiveBill(pendingOrUnpaid[0]);
        } else {
          setActiveBill(null);
        }
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


  useEffect(() => {
    if (activeProof && activeProof.screenshot_path) {
      let isMounted = true;
      API.get(`/bills/proofs/${activeProof.id}/download`, { responseType: 'blob' })
        .then(res => {
          if (isMounted) {
            setActiveProofScreenshotUrl(URL.createObjectURL(res.data));
          }
        })
        .catch(err => {
          console.error("Failed to fetch payment screenshot", err);
          if (isMounted) setActiveProofScreenshotUrl('');
        });
      return () => {
        isMounted = false;
      };
    } else {
      setActiveProofScreenshotUrl('');
    }
  }, [activeProof]);

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
      setTxnId('');
      setScreenshotFile(null);
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to submit payment proof.' });
    } finally {
      setSubmittingPay(false);
    }
  };

  const executeStatusUpdate = async () => {
    const statusVal = confirmStatusUpdate;
    if (!statusVal || !activeProof) return;

    if ((statusVal === 'FAILED' || statusVal === 'REJECTED') && !adminNotes.trim()) {
        setToast({ type: 'error', message: 'Please provide a reason for rejection in the notes.' });
        return;
    }

    setProcessingPayment(true);
    try {
      const formData = new FormData();
      formData.append('status_update', statusVal);
      if (adminNotes.trim()) {
        formData.append('admin_notes', adminNotes);
      }

      await API.patch(`/bills/proofs/${activeProof.id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      let msg = 'Payment verified successfully.';
      if (statusVal === 'FAILED') msg = 'Payment marked as failed.';
      else if (statusVal === 'RECEIVED') msg = 'Payment marked as received.';
      
      setToast({ type: 'success', message: msg });
      
      setActiveProof(null);
      setConfirmStatusUpdate(null);
      setAdminNotes('');
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Unable to update payment status. Please try again.' });
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
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-black" title="Cancel">
              <X className="w-5 h-5" />
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
                    src={qrPreviewUrl || activeQrUrl}
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


      {/* Tenant: Payment Dashboard */}
      {user.role === 'tenant' && (
        <div className="space-y-6">
          {!activeBill ? (
            <div className="bg-white p-8 rounded border border-gray-200 shadow-sm text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">No Current Bill Available</h3>
              <p className="text-sm text-gray-500 mt-1">Your current bill has not been generated yet or all bills are paid.</p>
            </div>
          ) : (
            <>
              {/* CURRENT BILL / AMOUNT DUE */}
              <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Current Bill</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Monthly Rent</p>
                      <p className="font-semibold text-gray-900">₹{activeBill.rent_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Electricity</p>
                      <p className="font-semibold text-gray-900">₹{activeBill.electricity_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Food / Board</p>
                      <p className="font-semibold text-gray-900">₹{activeBill.food_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Maintenance & Other</p>
                      <p className="font-semibold text-gray-900">₹{(activeBill.maintenance_amount + activeBill.other_amount)?.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Amount Due</p>
                      <p className="text-2xl font-bold text-gray-950">₹{activeBill.total_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Due Date</p>
                      <p className="font-semibold text-gray-800">{new Date(activeBill.due_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
                      <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusColor(getBillPaymentStatus(activeBill))}`}>
                        {getBillPaymentStatus(activeBill) === 'PENDING' ? 'PAYMENT DUE' : getBillPaymentStatus(activeBill)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC PAYMENT SECTION */}
              {(() => {
                const billStatus = getBillPaymentStatus(activeBill);
                const hasPendingOrReceived = billStatus === 'PENDING VERIFICATION' || billStatus === 'RECEIVED';
                const activePay = activeBill.payments && activeBill.payments.length > 0 ? activeBill.payments[activeBill.payments.length - 1] : null;

                if (hasPendingOrReceived && activePay) {
                  return (
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden animate-slide-in">
                      <div className="border-b border-gray-100 bg-gray-50 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Payment Submitted</h3>
                      </div>
                      <div className="p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="flex-shrink-0 bg-yellow-50 p-4 rounded-full border border-yellow-100">
                          <History className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div className="flex-1 space-y-4 text-center md:text-left">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-1">Your payment proof has been submitted successfully.</h4>
                            <p className="text-sm text-gray-500">The administration is currently reviewing your payment. You will be notified once it is verified.</p>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 text-sm text-left">
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
                              <span className="text-yellow-700 font-bold uppercase text-[11px] tracking-wider bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
                                {billStatus}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Submitted</p>
                              <p className="font-semibold text-gray-900">{new Date(activePay.submitted_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Amount</p>
                              <p className="font-semibold text-gray-900">₹{activePay.amount_paid?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">UTR / Ref</p>
                              <p className="font-semibold text-gray-900 font-mono text-xs bg-gray-50 px-1 py-0.5 rounded border border-gray-200 inline-block">{activePay.transaction_id || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
                    {/* MAKE PAYMENT & QR */}
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="border-b border-gray-100 bg-gray-50 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Make Payment</h3>
                      </div>
                      <div className="p-6 flex-1 flex flex-col space-y-6">
                        {billStatus === 'FAILED' && activePay?.admin_notes && (
                          <div className="bg-red-50 p-4 border border-red-200 rounded text-sm text-red-800 space-y-1">
                            <p className="font-bold uppercase tracking-wider text-[11px]">Payment Rejected</p>
                            <p><strong>Reason:</strong> {activePay.admin_notes}</p>
                            <p className="text-xs mt-1">Please submit a valid payment proof.</p>
                          </div>
                        )}

                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded border border-gray-100">
                          <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">Amount to Pay</span>
                          <span className="text-xl font-bold text-gray-950">₹{activeBill.total_amount?.toLocaleString()}</span>
                        </div>

                        {!paymentSettings?.qr_code_path && (!paymentSettings?.upi_id || paymentSettings.upi_id === 'amigospg@upi') ? (
                          <div className="text-center p-8 text-gray-500 flex-1 flex flex-col justify-center bg-gray-50 rounded border border-gray-100 border-dashed">
                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold">Online payment is currently unavailable.</p>
                            <p className="text-xs mt-1">Please contact the PG administrator for payment instructions.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row gap-6 flex-1">
                            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-100 rounded">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Scan to Pay</span>
                              {paymentSettings?.qr_code_path ? (
                                <div className="flex flex-col items-center">
                                  <img
                                    src={activeQrUrl}
                                    alt="Admin QR Code"
                                    className="w-32 h-32 md:w-40 md:h-40 object-contain bg-white p-2 border border-gray-200 rounded shadow-sm"
                                  />
                                  {activeQrUrl && (
                                    <a
                                      href={activeQrUrl}
                                      download="amigos_pg_qr.png"
                                      className="mt-3 flex items-center gap-1.5 text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 px-3 py-1.5 rounded"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Download QR
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <div className="w-32 h-32 md:w-40 md:h-40 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center">
                                  <Image className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-3">Amigos Mens Luxury PG</span>
                            </div>

                            <div className="flex-1 flex flex-col justify-center space-y-4">
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">UPI ID</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono font-bold text-gray-900 bg-gray-50 px-3 py-2 border border-gray-200 rounded flex-1 truncate">
                                    {paymentSettings?.upi_id || 'amigospg@upi'}
                                  </p>
                                  <button
                                    onClick={handleCopyUpiId}
                                    className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:border-black transition-colors"
                                    title="Copy UPI ID"
                                  >
                                    <Copy className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              </div>

                              <div className="bg-blue-50/50 p-3 border border-blue-100 rounded">
                                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">How to Pay</p>
                                <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside marker:font-bold marker:text-blue-500">
                                  <li>Scan the QR code using your UPI app.</li>
                                  <li>Verify the recipient and payment amount.</li>
                                  <li>Complete the payment.</li>
                                  <li>Take a screenshot of the successful payment.</li>
                                  <li>Upload the payment screenshot below.</li>
                                  <li>Submit the payment for verification.</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PAYMENT PROOF UPLOAD */}
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="border-b border-gray-100 bg-gray-50 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Submit Payment Proof</h3>
                      </div>
                      <form onSubmit={handlePayProofSubmit} className="p-6 flex-1 flex flex-col space-y-5">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase">Payment Amount</label>
                            <input
                              type="text"
                              disabled
                              value={`₹${activeBill.total_amount?.toLocaleString()}`}
                              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded shadow-sm sm:text-sm bg-gray-50 text-gray-600 font-semibold cursor-not-allowed"
                            />
                          </div>
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
                          <label className="block text-xs font-semibold text-gray-700 uppercase">Upload Payment Screenshot</label>
                          <div className="mt-1.5 flex flex-col gap-2">
                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded hover:border-black cursor-pointer text-sm font-semibold bg-gray-50 transition-colors">
                              <Upload className="w-5 h-5 text-gray-500" />
                              <span className="text-gray-600">Choose Image (JPG, PNG)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleScreenshotChange}
                              />
                            </label>
                            {screenshotFile && (
                              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 rounded">
                                <span className="text-xs text-gray-600 font-mono truncate max-w-[250px]">{screenshotFile.name}</span>
                                <button type="button" onClick={() => setScreenshotFile(null)} className="text-gray-400 hover:text-red-500">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 mt-auto">
                          <button
                            type="submit"
                            disabled={submittingPay}
                            className="w-full py-3 bg-black hover:bg-gray-900 text-white font-bold text-sm uppercase tracking-wider rounded shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {submittingPay ? 'Submitting...' : 'Submit Payment for Verification'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}
            </>
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
                        
                        {user.role === 'tenant' && (billStatus === 'PENDING VERIFICATION' || billStatus === 'RECEIVED' || bill.status === 'PAID') && (
                          <span className="text-gray-400 italic text-[11px] font-medium">In Ledger</span>
                        )}
                        {user.role === 'admin' && (
                          <button
                            onClick={() => {
                              // If ledger has payment proof, view details
                              const matchProof = bill.payments && bill.payments.length > 0 ? bill.payments[bill.payments.length - 1] : null;
                              if (matchProof && matchProof.screenshot_path) {
                                setActiveProof({ ...matchProof, bill: bill });
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

      {/* Admin: View Payment Proof Verification details Modal */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          {!confirmStatusUpdate ? (
            <div className="bg-white rounded-lg border border-gray-200 w-full max-w-3xl shadow-2xl animate-slide-in my-8 flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg sticky top-0 z-10">
                <div>
                  <span className="text-xs text-indigo-600 uppercase font-bold tracking-wider">Verify Payment</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">Proof Verification (Bill ID #{activeProof.bill_id})</h3>
                </div>
                <button onClick={() => {
                  setActiveProof(null);
                  setAdminNotes('');
                }} className="text-gray-400 hover:text-gray-800 transition-colors bg-white p-1.5 rounded-md border border-transparent hover:border-gray-200 shadow-sm" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto flex-1">
                {/* PAYMENT INFORMATION */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Payment Information</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Resident</div>
                      <div className="font-bold text-gray-900 text-base">{activeProof.bill?.user?.first_name || 'Unknown'} {activeProof.bill?.user?.last_name || ''}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Amount</div>
                      <div className="font-bold text-emerald-600 text-base">₹{activeProof.amount_paid?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">UTR / Transaction ID</div>
                      <div className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded inline-block border border-gray-200">{activeProof.transaction_id || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Payment Mode</div>
                      <div className="font-bold text-gray-900 uppercase">{activeProof.payment_method}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Payment Date</div>
                      <div className="font-semibold text-gray-800">{new Date(activeProof.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Submitted</div>
                      <div className="font-semibold text-gray-800">{new Date(activeProof.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 mb-1">Status</div>
                      <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${activeProof.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : activeProof.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {activeProof.status === 'PENDING' ? 'PENDING VERIFICATION' : activeProof.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PAYMENT SCREENSHOT */}
                <div>
                  <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Screenshot</h4>
                    <button
                      onClick={() => handleDownloadScreenshot(activeProof.id, activeProof.screenshot_path)}
                      className="flex items-center gap-1.5 text-xs uppercase font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 px-3 py-1.5 rounded"
                    >
                      <Download className="w-4 h-4" /> Download Image
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 text-center relative min-h-[150px] flex items-center justify-center">
                    {activeProofScreenshotUrl ? (
                      <img
                        src={activeProofScreenshotUrl}
                        alt="Payment screenshot proof"
                        className="max-h-[400px] object-contain mx-auto rounded shadow-sm bg-white"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <Image className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">Loading payment screenshot...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* VERIFICATION NOTES */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">Verification Notes</h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter optional remarks for successful verification, or required reason for rejection."
                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    rows="3"
                  ></textarea>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                  onClick={() => setConfirmStatusUpdate('FAILED')}
                  className="px-5 py-2.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-md font-semibold text-sm transition-colors shadow-sm"
                >
                  Mark Failed
                </button>
                <button
                  onClick={() => setConfirmStatusUpdate('RECEIVED')}
                  className="px-5 py-2.5 bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 hover:border-amber-300 rounded-md font-semibold text-sm transition-colors shadow-sm"
                >
                  Mark Received
                </button>
                <button
                  onClick={() => setConfirmStatusUpdate('SUCCESS')}
                  className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md font-semibold text-sm transition-colors shadow-sm"
                >
                  Mark Success
                </button>
              </div>
            </div>
          ) : (
            /* CONFIRMATION MODAL */
            <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md shadow-2xl animate-slide-in">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 className="text-lg font-bold text-gray-900">
                  {confirmStatusUpdate === 'SUCCESS' ? 'Confirm Payment Verification' : 
                   confirmStatusUpdate === 'FAILED' ? 'Reject Payment' : 
                   'Acknowledge Receipt'}
                </h3>
                <button onClick={() => setConfirmStatusUpdate(null)} className="text-gray-400 hover:text-gray-800" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 text-sm text-gray-700">
                {confirmStatusUpdate === 'SUCCESS' && (
                  <>
                    <p className="mb-4">Are you sure you want to mark this payment as successful?</p>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Resident:</span>
                        <span className="font-bold text-gray-900">{activeProof.bill?.user?.first_name} {activeProof.bill?.user?.last_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Amount:</span>
                        <span className="font-bold text-emerald-600">₹{activeProof.amount_paid?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">UTR:</span>
                        <span className="font-mono font-bold text-gray-900">{activeProof.transaction_id}</span>
                      </div>
                    </div>
                    <p className="font-medium text-emerald-700 bg-emerald-50 p-3 rounded border border-emerald-100">
                      This will automatically mark the related bill as paid.
                    </p>
                  </>
                )}
                
                {confirmStatusUpdate === 'FAILED' && (
                  <>
                    <p className="mb-4 font-medium text-gray-900">Please provide a reason for rejection.</p>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g., UTR mismatch, wrong amount, blurry screenshot..."
                      className="w-full border border-red-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      rows="4"
                    ></textarea>
                    {!adminNotes.trim() && <p className="text-red-500 text-xs mt-1">* Reason is required to mark as failed.</p>}
                  </>
                )}
                
                {confirmStatusUpdate === 'RECEIVED' && (
                  <p>Mark this payment as received? It will remain pending verification but the tenant will be notified that the PG administration is reviewing it.</p>
                )}
              </div>
              
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                <button
                  onClick={() => setConfirmStatusUpdate(null)}
                  disabled={processingPayment}
                  className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={executeStatusUpdate}
                  disabled={processingPayment || (confirmStatusUpdate === 'FAILED' && !adminNotes.trim())}
                  className={`px-5 py-2 text-white rounded-md font-semibold flex items-center gap-2 ${
                    confirmStatusUpdate === 'SUCCESS' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    confirmStatusUpdate === 'FAILED' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-amber-600 hover:bg-amber-700'
                  } disabled:opacity-50`}
                >
                  {processingPayment ? 'Processing...' : 
                   confirmStatusUpdate === 'SUCCESS' ? 'Confirm Success' : 
                   confirmStatusUpdate === 'FAILED' ? 'Reject Payment' : 
                   'Confirm Receipt'}
                </button>
              </div>
            </div>
          )}
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
