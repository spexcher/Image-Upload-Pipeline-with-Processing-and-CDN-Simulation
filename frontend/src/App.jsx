import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import VariantsDisplay from './components/VariantsDisplay';
import Gallery from './components/Gallery';

function getInitialTheme() {
  // Check localStorage first, then OS preference
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme attribute to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleUploadSuccess = (id) => {
    setActiveUploadId(id);
  };

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <h1 className="header-title">Image Pipeline</h1>
          <p className="header-subtitle">
            Upload an image to generate optimized variants — original, medium, and thumbnail.
          </p>
        </div>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="theme-toggle-icon">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section>
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </section>

        {activeUploadId && (
          <section>
            <VariantsDisplay uploadId={activeUploadId} />
          </section>
        )}

        <Gallery key={activeUploadId || 'initial'} />
      </main>
    </div>
  );
}
