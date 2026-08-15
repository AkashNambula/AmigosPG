import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import API from '../services/api';
import { 
  CreditCard, Plus, HelpCircle, AlertCircle, FileText, 
  CheckCircle2, History, X, Copy, Upload, Download, Check, Image as ImageIcon
} from 'lucide-react';
import Toast from '../components/Toast';

// SecureImage component to fetch authenticated images via blob requests
function SecureImage({ src, alt, className, fallback }) {
  const [imgUrl, setImgUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSecureImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await API.get(src, { responseType: 'blob' });
        if (active) {
          const url = URL.createObjectURL(response.data);
          setImgUrl(url);
        }
      } catch (err) {
        console.error("Failed to load secure image:", src, err);
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (src) {
      loadSecureImage();
    } else {
      setLoading(false);
      setError(true);
    }

    return () => {
      active = false;
      if (imgUrl) {
        URL.revokeObjectURL(imgUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-xs text-gray-400 italic">
        Loading image...
      </div>
    );
  }

  if (error || !imgUrl) {
    return fallback || (
      <div className="text-center text-gray-400 py-6">
        <ImageIcon className="w-8 h-8 stroke-1 mx-auto text-gray-300" />
        <p className="text-[10px] uppercase font-bold tracking-wider mt-1">Image Not Available</p>
      </div>
    );
  }

  return <img src={imgUrl} alt={alt} className={className} />;
}

export default function PayBills() {
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

  // Tenant payment state
  const [activeBill, setActiveBill] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');
  const [txnId, setTxnId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

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
      } else {
        // Tenant default selection
        const tenantBills = billsRes.data;
        if (tenantBills.length > 0) {
          // default to latest unpaid/pending bill, or just the first bill
          const unpaid = tenantBills.find(b => b.status === 'PENDING');
          setActiveBill(unpaid || tenantBills[0]);
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
          if (match.payments && match.payments.length > 0) {
            const activePay = match.payments[match.payments.length - 1];
            if (activePay.screenshot_path) {
              setActiveProof(activePay);
              setAdminNotes(activePay.admin_notes || '');
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
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to generate bill invoice.' });
    } finally {
      setSubmittingBill(false);
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    if (!upiIdInput) return;

    setSavingSettings(true);
    try {
      const formData = new FormData();
      formData.append('upi_id', upiIdInput.trim());
      
      await API.put('/bills/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (qrFile) {
        const qrFormData = new FormData();
        qrFormData.append('qr_file', qrFile);
        await API.post('/bills/settings/qr', qrFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setToast({ type: 'success', message: 'Payment configurations saved successfully.' });
      setQrFile(null);
      if (qrPreviewUrl) {
        URL.revokeObjectURL(qrPreviewUrl);
        setQrPreviewUrl('');
      }
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
    const upi = paymentSettings?.upi_id || 'amigospg@upi';
    navigator.clipboard.writeText(upi);
    setToast({ type: 'success', message: 'UPI ID copied successfully.' });
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setToast({ type: 'error', message: 'Please upload a valid payment screenshot under 5 MB.' });
      e.target.value = '';
      setScreenshotFile(null);
      setScreenshotPreview('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Please upload a valid payment screenshot under 5 MB.' });
      e.target.value = '';
      setScreenshotFile(null);
      setScreenshotPreview('');
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview('');
    }
  };

  const handlePayProofSubmit = async (e) => {
    e.preventDefault();
    if (!activeBill) return;
    
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

      setToast({ type: 'success', message: 'Payment proof submitted successfully. It is waiting for Admin verification.' });
      setTxnId('');
      setScreenshotFile(null);
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
        setScreenshotPreview('');
      }
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to submit payment proof.' });
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleStatusUpdateAction = async (statusVal) => {
    if (!activeProof) return;
    setProcessingPayment(true);
    try {
      const formData = new FormData();
      formData.append('status_update', statusVal);
      if (adminNotes) {
        formData.append('admin_notes', adminNotes);
      }
      
      await API.patch(`/bills/proofs/${activeProof.id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setToast({ type: 'success', message: `Verification status updated to ${statusVal}.` });
      setActiveProof(null);
      setAdminNotes('');
      fetchBillsAndData();
    } catch (err) {
      setToast({ type: 'error', message: err.friendlyMessage || 'Failed to update proof verification status.' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDownloadScreenshot = async (payId, filePath) => {
    try {
      const res = await API.get(`/bills/proofs/${payId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = filePath.split(/[\\/]/).pop() || `screenshot_${payId}.png`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to download screenshot proof.' });
    }
  };

  const getBillPaymentStatus = (bill) => {
    if (!bill) return 'UNPAID';
    if (bill.status === 'PAID') return 'SUCCESS';
    if (bill.payments && bill.payments.length > 0) {
      const latestPayment = bill.payments[bill.payments.length - 1];
      if (latestPayment.status === 'PENDING') return 'PENDING VERIFICATION';
      return latestPayment.status; // RECEIVED, SUCCESS, FAILED
    }
    return 'UNPAID';
  };

  const getPaymentStatusColor = (status) => {
    const styles = {
      'PENDING VERIFICATION': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'RECEIVED': 'bg-blue-50 text-blue-700 border-blue-200',
      'SUCCESS': 'bg-green-50 text-green-700 border-green-200',
      'FAILED': 'bg-red-50 text-red-700 border-red-200',
      'UNPAID': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return styles[status] || styles.UNPAID;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

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

      {/* ADMIN INTERFACE */}
      {user.role === 'admin' && (
        <>
          {/* Admin: Create Bill Form */}
          {showCreateForm && (
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
                    {qrPreviewUrl ? (
                      <img
                        src={qrPreviewUrl}
                        alt="Preview selected QR code"
                        className="w-32 h-32 object-contain bg-white p-2 border border-gray-200 rounded mx-auto"
                      />
                    ) : (
                      <SecureImage
                        src="/bills/settings/qr"
                        alt="Active QR code scanner"
                        className="w-32 h-32 object-contain bg-white p-2 border border-gray-200 rounded mx-auto"
                      />
                    )}
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
                    <ImageIcon className="w-12 h-12 stroke-1 mx-auto text-gray-300" />
                    <p className="text-[10px] uppercase font-bold tracking-wider">No QR Scanner Uploaded</p>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Admin: Payment Verification Ledger */}
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Payment Verification Ledger</h3>
            </div>

            {paymentProofs.length === 0 ? (
              <div className="text-center p-8 text-xs text-gray-400 italic">No submitted payment proofs found in system.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-250 border border-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Resident</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Room</th>
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
                        <td className="px-4 py-3.5 font-mono text-gray-600 font-semibold">{proof.bill?.user?.room_number || 'N/A'}</td>
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

          {/* Admin Ledger History */}
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
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Resident</th>
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
                          <td className="px-4 py-3.5 text-gray-600 font-semibold">{bill.user?.first_name} {bill.user?.last_name}</td>
                          <td className="px-4 py-3.5 font-bold text-gray-950">INR {bill.total_amount?.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-gray-500">{new Date(bill.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusColor(billStatus)}`}>
                              {billStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TENANT / USER INTERFACE (REDESIGNED PAY BILLS PAGE) */}
      {user.role === 'tenant' && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Bill selector dropdown */}
          {bills.length > 0 ? (
            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Invoice</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Switch between generated bills or invoices to pay.</p>
              </div>
              <select
                value={activeBill?.id || ''}
                onChange={(e) => {
                  const match = bills.find(b => b.id === parseInt(e.target.value));
                  if (match) {
                    setActiveBill(match);
                    setTxnId('');
                    setScreenshotFile(null);
                    if (screenshotPreview) {
                      URL.revokeObjectURL(screenshotPreview);
                      setScreenshotPreview('');
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-black focus:border-black text-xs font-semibold bg-white min-w-[250px]"
              >
                {bills.map(b => (
                  <option key={b.id} value={b.id}>
                    Invoice AMPG-B{String(b.id).padStart(3, '0')} (₹{b.total_amount?.toLocaleString()}) - {getBillPaymentStatus(b)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-white p-8 text-center rounded border border-gray-200 text-sm text-gray-500 italic">
              You have no outstanding invoice bills generated at the moment.
            </div>
          )}

          {activeBill && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Bill details, UPI payment, QR Scanner */}
              <div className="space-y-8">
                {/* 1. BILL DETAILS */}
                <div className="bg-white p-6 rounded border border-gray-250 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill Details</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Monthly Rent:</span>
                      <span className="font-semibold text-gray-900">₹{activeBill.rent_amount?.toLocaleString()}</span>
                    </div>
                    {(activeBill.electricity_amount > 0 || activeBill.food_amount > 0 || activeBill.maintenance_amount > 0 || activeBill.other_amount > 0) && (
                      <div className="space-y-1.5 pl-2 border-l border-gray-150 py-1 text-[11px] text-gray-400">
                        {activeBill.electricity_amount > 0 && <div>Electricity charges: ₹{activeBill.electricity_amount}</div>}
                        {activeBill.food_amount > 0 && <div>Food board bill: ₹{activeBill.food_amount}</div>}
                        {activeBill.maintenance_amount > 0 && <div>Maintenance fee: ₹{activeBill.maintenance_amount}</div>}
                        {activeBill.other_amount > 0 && <div>Other misc fee: ₹{activeBill.other_amount}</div>}
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm font-bold text-gray-900">
                      <span>Total Amount:</span>
                      <span>₹{activeBill.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500 pt-1 text-[11px]">
                      <span>Due Date:</span>
                      <span>{new Date(activeBill.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold text-gray-600">Status:</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusColor(getBillPaymentStatus(activeBill))}`}>
                        {getBillPaymentStatus(activeBill)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. PAY USING UPI */}
                <div className="bg-white p-6 rounded border border-gray-250 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pay Using UPI</h3>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">UPI ID</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono font-bold text-xs text-gray-800 bg-gray-50 px-3 py-2 border border-gray-200 rounded select-all truncate">
                        {paymentSettings?.upi_id || 'amigospg@upi'}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-xs font-semibold rounded hover:border-black transition-colors bg-white cursor-pointer select-none"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>COPY</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. PAY WITH SCANNER */}
                <div className="bg-white p-6 rounded border border-gray-250 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pay With Scanner</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center border border-gray-200 rounded p-4 bg-gray-50/50">
                    <SecureImage
                      src="/bills/settings/qr"
                      alt="Amigos PG Admin QR Code"
                      className="w-48 h-48 object-contain bg-white p-2 border border-gray-100 rounded shadow-sm mx-auto"
                    />
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-2">Amigos Mens Luxury PG</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Proof Upload */}
              <div className="space-y-8">
                {/* 4. PAYMENT PROOF */}
                <div className="bg-white p-6 rounded border border-gray-250 shadow-sm space-y-6">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Proof</h3>
                  </div>

                  {getBillPaymentStatus(activeBill) === 'SUCCESS' ? (
                    <div className="text-center p-8 border border-green-200 bg-green-50/10 rounded space-y-2">
                      <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                      <h4 className="text-sm font-bold text-green-800 uppercase tracking-wider">Payment Successful</h4>
                      <p className="text-xs text-green-600 max-w-xs mx-auto leading-relaxed">
                        This bill invoice has been successfully settled and verified. Thank you!
                      </p>
                    </div>
                  ) : getBillPaymentStatus(activeBill) === 'PENDING VERIFICATION' || getBillPaymentStatus(activeBill) === 'RECEIVED' ? (
                    <div className="text-center p-8 border border-blue-200 bg-blue-50/10 rounded space-y-2">
                      <History className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
                      <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Verification Pending</h4>
                      <p className="text-xs text-blue-600 max-w-xs mx-auto leading-relaxed">
                        Your payment proof has been submitted successfully and is currently waiting for admin validation.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handlePayProofSubmit} className="space-y-5">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        After completing the payment, upload a screenshot of your successful transaction details (GooglePay, PhonePe, NEFT receipt).
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Payment Mode</label>
                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                            className="mt-1 block w-full px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-black focus:border-black text-xs bg-white"
                          >
                            <option value="UPI">UPI / GPay / PhonePe</option>
                            <option value="Net Banking">Net Banking / NEFT</option>
                            <option value="Cash">Cash to Owner</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Payment Date</label>
                          <input
                            type="date"
                            required
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="mt-1 block w-full px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-black focus:border-black text-xs bg-white font-semibold text-gray-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">UTR / Reference ID</label>
                        <input
                          type="text"
                          required
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                          placeholder="Enter 12-digit transaction number"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-black focus:border-black text-xs bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Upload Screenshot (JPG, PNG, WEBP)</label>
                        <div className="mt-2 flex items-center gap-3">
                          <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded hover:border-black cursor-pointer text-xs font-semibold bg-white select-none">
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span>Choose Screenshot</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleScreenshotChange}
                            />
                          </label>
                          {screenshotFile && (
                            <span className="text-[11px] text-gray-600 font-mono truncate max-w-[150px]" title={screenshotFile.name}>
                              {screenshotFile.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Preview selected screenshot */}
                      {screenshotPreview && (
                        <div className="border border-gray-200 rounded p-2 bg-gray-50 space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase font-bold">
                            <span>Screenshot Preview</span>
                            <button
                              type="button"
                              onClick={handleRemoveScreenshot}
                              className="text-red-500 hover:underline hover:text-red-700"
                            >
                              [ REMOVE ]
                            </button>
                          </div>
                          <img
                            src={screenshotPreview}
                            alt="Selected screenshot preview"
                            className="max-h-40 object-contain mx-auto rounded bg-white shadow-sm border border-gray-150"
                          />
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={submittingPay}
                          className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-bold text-xs uppercase tracking-wider rounded disabled:opacity-50 transition-colors shadow-sm cursor-pointer select-none"
                        >
                          {submittingPay ? 'Submitting Proof...' : 'Submit Payment Proof'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="border-t border-gray-150 pt-4 text-xs font-bold text-gray-500 flex justify-between items-center">
                    <span>Payment Status:</span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusColor(getBillPaymentStatus(activeBill))}`}>
                      {getBillPaymentStatus(activeBill)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                <div>Room: <span className="font-bold text-gray-900">{activeProof.bill?.user?.room_number || 'N/A'}</span></div>
                <div>Submitted Amount: <span className="font-bold text-gray-955">INR {activeProof.amount_paid?.toLocaleString()}</span></div>
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
                  <SecureImage
                    src={`/bills/proofs/${activeProof.id}/download`}
                    alt="Payment screenshot proof"
                    className="max-h-60 object-contain mx-auto rounded bg-white shadow-sm"
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
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs font-bold uppercase rounded tracking-wider transition-colors animate-fadeIn"
                  >
                    Mark Failed
                  </button>
                  <button
                    onClick={() => handleStatusUpdateAction('RECEIVED')}
                    disabled={processingPayment}
                    className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-bold uppercase rounded tracking-wider transition-colors animate-fadeIn"
                  >
                    Mark Received
                  </button>
                  <button
                    onClick={() => handleStatusUpdateAction('SUCCESS')}
                    disabled={processingPayment}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase rounded tracking-wider transition-colors animate-fadeIn"
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
