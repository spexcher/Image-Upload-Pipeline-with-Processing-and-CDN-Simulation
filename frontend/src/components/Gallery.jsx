import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3001';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`${API_BASE}/images`);
        if (!res.ok) throw new Error('Failed to fetch gallery images');
        const data = await res.json();
        //We Filter out those that don't have a thumbnail yet
        const completed = data.filter(img => img.status === 'completed' && img.variants?.thumbnail);
        setImages(completed);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all uploads?')) return;
    try {
      const res = await fetch(`${API_BASE}/images`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear gallery');
      setImages([]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image.');
    }
  };

  if (loading) return <div>Loading gallery...</div>;
  if (error) return <div style={{ color: 'var(--error-color)' }}>Error: {error}</div>;
  if (images.length === 0) return null;

  return (
    <section className="gallery-section">
      <div className="gallery-header">
        <h2 className="gallery-title">Recent Uploads</h2>
        <button type="button" onClick={handleClear} className="btn-danger">🗑 Clear Gallery</button>
      </div>
      <p className="gallery-subtitle">Masonry grid of all your generated thumbnails. Click any image to download.</p>

      <div className="gallery-grid">
        {images.map(img => (
          <div
            key={img.id}
            className="gallery-item"
            onClick={() => handleDownload(`${API_BASE}${img.variants.original ? img.variants.original.url : img.variants.thumbnail.url}`, img.originalName)}
            title="Click to download original image"
          >
            <img
              src={`${API_BASE}${img.variants.thumbnail.url}`}
              alt={`Thumbnail for ${img.originalName}`}
              loading="lazy"
            />
            <div className="gallery-item-overlay">
              <span className="gallery-item-name">{img.originalName}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
