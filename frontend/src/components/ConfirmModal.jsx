import React, { useEffect } from 'react';
import { AlertTriangle, X, Loader2, CheckCircle2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  pgName,
  confirmText = 'Deactivate PG',
  confirmVariant = 'danger', // 'danger' | 'success'
  loading = false,
  onConfirm,
  onClose
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {isDanger ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          {!loading && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {pgName && (
            <div className="p-3.5 rounded-lg bg-gray-100/80 border border-gray-200 text-center">
              <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider block mb-0.5">Target PG Property</span>
              <span className="text-base font-extrabold text-gray-900">{pgName}</span>
            </div>
          )}
          <p className="text-sm text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm focus:outline-none disabled:opacity-50 transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? (confirmText === 'Delete PG' ? 'Deleting...' : 'Processing...') : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
