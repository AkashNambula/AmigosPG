import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded shadow-md border border-gray-200 text-center">
        <div className="inline-flex p-4 rounded-full bg-red-50 text-red-600 border border-red-200">
          <ShieldAlert className="w-12 h-12 stroke-1.5" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            Access Forbidden
          </h2>
          <p className="text-sm text-gray-500">
            You do not have the required permissions to view this administration page.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm uppercase rounded transition-colors"
          >
            Go to User Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
