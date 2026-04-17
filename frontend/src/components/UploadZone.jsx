import React, { useState, useRef, useCallback } from 'react';

const SIMULATED_DURATION_MS = 2800; // how long the fake 0→90% fill takes
const TICK_MS = 40;                  // update every 40ms → ~25fps

export default function UploadZone({ onUploadSuccess }) {
  const [isDragActive, setIsDragActive]   = useState(false);
  const [progress, setProgress]           = useState(0);
  const [uploading, setUploading]         = useState(false);
  const [statusText, setStatusText]       = useState('');
  const [error, setError]                 = useState(null);

  const fileInputRef     = useRef(null);
  const simulationRef    = useRef(null); // interval id for fake fill
  const resolvedRef      = useRef(false); // did XHR already finish?
  const currentPctRef    = useRef(0);    // tracks current simulated %

  // ── helpers ────────────────────────────────────────────────────────────────

  const clearSimulation = () => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  };

  /**
   * Animate the progress bar from its current position to `target` over
   * `durationMs` using smooth easing.  Calls `onDone` when finished.
   */
  const animateTo = useCallback((target, durationMs, onDone) => {
    clearSimulation();
    const start     = currentPctRef.current;
    const range     = target - start;
    const steps     = Math.ceil(durationMs / TICK_MS);
    let   step      = 0;

    simulationRef.current = setInterval(() => {
      step++;
      // ease-out: fast start, decelerates near the target
      const t   = step / steps;
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const next  = Math.round(start + range * eased);

      currentPctRef.current = next;
      setProgress(next);

      if (step >= steps) {
        clearSimulation();
        if (onDone) onDone();
      }
    }, TICK_MS);
  }, []);

  // ── validation ─────────────────────────────────────────────────────────────

  const validateAndUpload = (file) => {
    setError(null);
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit.');
      return;
    }
    uploadFile(file);
  };

  // ── XHR upload ─────────────────────────────────────────────────────────────

  const uploadFile = (file) => {
    setUploading(true);
    setStatusText('Uploading…');
    resolvedRef.current   = false;
    currentPctRef.current = 0;
    setProgress(0);

    const formData = new FormData();
    formData.append('image', file);
    const xhr = new XMLHttpRequest();

    // ── Real XHR progress events ──────────────────────────────────────────
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // Mirror the real progress directly. For large files on slow connections
        // this gives a true reading; for localhost it usually jumps straight to
        // 100 which is why we pair it with the simulation below.
        const real = Math.round((e.loaded / e.total) * 100);
        // Only advance if real is ahead of where our simulation sits
        if (real > currentPctRef.current) {
          currentPctRef.current = real;
          setProgress(real);
        }
      }
    });

    // ── Simulated slow fill: 0 → 90 % over SIMULATED_DURATION_MS ─────────
    // This ensures the user always sees movement even on ultra-fast networks.
    animateTo(90, SIMULATED_DURATION_MS, () => {
      // When simulation reaches 90%, pause and wait for the real response.
      // If the server already replied (resolvedRef), nothing to wait for.
    });

    // ── Server responded ──────────────────────────────────────────────────
    xhr.addEventListener('load', () => {
      resolvedRef.current = true;
      clearSimulation();

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);

          // Animate from wherever we are → 100% quickly
          setStatusText('Processing…');
          animateTo(100, 350, () => {
            setStatusText('Done!');
            setTimeout(() => {
              setUploading(false);
              setProgress(0);
              currentPctRef.current = 0;
              setStatusText('');
              onUploadSuccess(response.id);
            }, 600);
          });
        } catch {
          setError('Failed to parse server response.');
          resetState();
        }
      } else {
        let errMsg = 'Upload failed.';
        try {
          const r = JSON.parse(xhr.responseText);
          if (r.error) errMsg = r.error;
        } catch {}
        setError(errMsg);
        resetState();
      }
    });

    xhr.addEventListener('error', () => {
      clearSimulation();
      setError('Network error occurred during upload.');
      resetState();
    });

    xhr.addEventListener('abort', () => {
      clearSimulation();
      resetState();
    });

    xhr.open('POST', 'http://localhost:3001/uploads', true);
    xhr.send(formData);
  };

  const resetState = () => {
    clearSimulation();
    setUploading(false);
    setProgress(0);
    currentPctRef.current = 0;
    setStatusText('');
  };

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDragActive) setIsDragActive(true); };
  const handleDrop      = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.length) validateAndUpload(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => {
    if (e.target.files?.length) validateAndUpload(e.target.files[0]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div
        className={`upload-zone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{ cursor: uploading ? 'default' : 'pointer' }}
      >
        <span className="upload-icon">{uploading ? '⏳' : '☁️'}</span>
        <h3 className="upload-text">
          {uploading
            ? statusText || 'Uploading…'
            : isDragActive
              ? 'Drop image here'
              : 'Drag & drop an image'}
        </h3>
        <p className="upload-subtext">
          {uploading
            ? `${progress}% complete`
            : 'or click to browse (JPEG, PNG, WebP up to 5MB)'}
        </p>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/jpeg, image/png, image/webp"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Progress bar: always shown while uploading ── */}
      {uploading && (
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
          <div className="progress-label">{progress}%</div>
        </div>
      )}

      {error && (
        <p className="upload-error">{error}</p>
      )}
    </div>
  );
}
