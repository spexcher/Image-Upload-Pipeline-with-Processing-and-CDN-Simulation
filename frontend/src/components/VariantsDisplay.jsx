import React, { useEffect, useState, useRef } from 'react';

const API_BASE = 'http://localhost:3001';

export default function VariantsDisplay({ uploadId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!uploadId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/images/${uploadId}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const json = await res.json();
        
        setData(json);

        if (json.status === 'completed' || json.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        setError(err.message);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      }
    };

    // Initial fetch
    fetchStatus();

    // Start polling
    pollIntervalRef.current = setInterval(fetchStatus, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [uploadId]);

  if (error) {
    return <div style={{ color: 'var(--error-color)' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div>Initializing...</div>;
  }

  if (data.status === 'pending' || data.status === 'processing') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Processing your image variants... Please wait.</p>
        <div style={{ marginTop: '1rem' }} className="status-pill status-pending">
          {data.status.toUpperCase()}
        </div>
      </div>
    );
  }

  if (data.status === 'failed') {
    return (
      <div style={{ color: 'var(--error-color)' }}>
        Processing failed: {data.error}
      </div>
    );
  }

  const { variants } = data;

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderCard = (key, variant) => (
    <div key={key} className="variant-card">
      <div className="variant-image-wrapper">
        <img 
          src={`${API_BASE}${variant.url}`} 
          alt={`${key} variant`} 
          className="variant-image" 
        />
      </div>
      <h4 className="variant-title">{key}</h4>
      <div className="variant-meta">
        <span>{variant.width} &times; {variant.height}</span>
        <span>{formatSize(variant.size)}</span>
      </div>
    </div>
  );

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Generated Variants</h3>
      <div className="variants-container">
        {variants && Object.entries(variants).map(([key, variant]) => renderCard(key, variant))}
      </div>
    </div>
  );
}
