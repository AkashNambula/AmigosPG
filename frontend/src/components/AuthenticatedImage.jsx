import React, { useState, useEffect } from 'react';
import API from '../api/axios';

/**
 * AuthenticatedImage component for safely rendering images requiring JWT authorization.
 * Avoids unauthenticated image exposure and handles Blob URL generation cleanly.
 */
const AuthenticatedImage = ({ src, alt, className, fallback = null, style = {} }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl = null;

    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    // If it's already a blob URL or base64 data URL, use directly
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        let endpoint = src;
        if (!src.startsWith('/files/secure') && !src.startsWith('/api/files/secure')) {
          endpoint = `/files/secure?file_path=${encodeURIComponent(src)}`;
        }

        const response = await API.get(endpoint, { responseType: 'blob' });
        if (isMounted) {
          currentObjectUrl = URL.createObjectURL(response.data);
          setBlobUrl(currentObjectUrl);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to load authenticated image:', src, err);
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 flex items-center justify-center ${className || ''}`} style={style}>
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    if (fallback) return fallback;
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className || ''}`} style={style}>
        <span className="text-xs">No image</span>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt || 'Image'}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
};

export default AuthenticatedImage;
