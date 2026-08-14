import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const typeStyles = {
    success: {
      bg: 'bg-white border-l-4 border-green-500',
      text: 'text-gray-900',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    },
    error: {
      bg: 'bg-white border-l-4 border-red-500',
      text: 'text-gray-900',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    },
    warning: {
      bg: 'bg-white border-l-4 border-yellow-500',
      text: 'text-gray-900',
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    },
    info: {
      bg: 'bg-white border-l-4 border-gray-600',
      text: 'text-gray-900',
      icon: <Info className="w-5 h-5 text-gray-500" />,
    },
  };

  const styles = typeStyles[type] || typeStyles.success;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center p-4 rounded shadow-lg max-w-sm ${styles.bg} transition-all duration-300 animate-slide-in`}>
      <div className="flex-shrink-0 mr-3">
        {styles.icon}
      </div>
      <div className="flex-grow mr-2">
        <p className={`text-sm font-medium ${styles.text}`}>{message}</p>
      </div>
      <button 
        onClick={onClose} 
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
