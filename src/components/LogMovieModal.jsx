import { useEffect, useRef, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import RatingSlider from './RatingSlider';
import { enqueueMovieLog } from '../utils/offlineQueue';
import { checkDuplicateInCollection } from '../utils/collectionIntegrity';
import { lookupMovieByUpc } from '../api/upc';
import './LogMovieModal.css';
import { createPortal } from 'react-dom';

const MOODS = [
  // Emotional (Warm/Red)
  { id: 'bittersweet', label: 'Bittersweet', emoji: '🥀', category: 'emotional' },
  { id: 'uplifting', label: 'Uplifting', emoji: '✨', category: 'emotional' },
  { id: 'bleak', label: 'Bleak', emoji: '☁️', category: 'emotional' },
  { id: 'romantic', label: 'Romantic', emoji: '💕', category: 'emotional' },
  { id: 'feel-good', label: 'Feel-good', emoji: '😊', category: 'emotional' },
  { id: 'nostalgic', label: 'Nostalgic', emoji: '📼', category: 'emotional' },
  { id: 'heart-wrenching', label: 'Heart-wrenching', emoji: '💔', category: 'emotional' },
  { id: 'inspiring', label: 'Inspiring', emoji: '🌟', category: 'emotional' },
  
  // Vibe (Cool/Purple)
  { id: 'atmospheric', label: 'Atmospheric', emoji: '🌫️', category: 'vibe' },
  { id: 'dark', label: 'Dark', emoji: '🌑', category: 'vibe' },
  { id: 'tense', label: 'Tense', emoji: '😰', category: 'vibe' },
  { id: 'gory', label: 'Gory', emoji: '🩸', category: 'vibe' },
  { id: 'eerie', label: 'Eerie', emoji: '🏚️', category: 'vibe' },
  { id: 'claustrophobic', label: 'Claustrophobic', emoji: '📦', category: 'vibe' },
  { id: 'campy', label: 'Campy', emoji: '🪓', category: 'vibe' },
  { id: 'dread', label: 'Dread-filled', emoji: '😨', category: 'vibe' },
  { id: 'jump-scary', label: 'Jump-scary', emoji: '👻', category: 'vibe' },
  { id: 'adrenaline-fueled', label: 'Adrenaline-fueled', emoji: '🔥', category: 'vibe' },
  { id: 'hilarious', label: 'Hilarious', emoji: '😂', category: 'vibe' },
  { id: 'epic', label: 'Epic', emoji: '🏔️', category: 'vibe' },
  { id: 'swoon-worthy', label: 'Swoon-worthy', emoji: '😍', category: 'vibe' },
  { id: 'stylized', label: 'Stylized', emoji: '🎨', category: 'vibe' },
  { id: 'satirical', label: 'Satirical', emoji: '🎭', category: 'vibe' },
  
  // Intellectual (Slate/Grey)
  { id: 'mindbending', label: 'Mind-bending', emoji: '🌀', category: 'intellectual' },
  { id: 'psychological', label: 'Psychological', emoji: '🧠', category: 'intellectual' },
  { id: 'technological', label: 'Technological', emoji: '🤖', category: 'intellectual' },
  { id: 'profound', label: 'Profound', emoji: '🌌', category: 'intellectual' },
  { id: 'political', label: 'Political', emoji: '🏛️', category: 'intellectual' },
  { id: 'cerebral', label: 'Cerebral', emoji: '🎓', category: 'intellectual' },
];

/**
 * LogMovieModal Component - Nuclear Option
 */
function LogMovieModal({ movie, existingLog, onClose, onSaved }) {

  const { user, isAuthenticated } = useUser();
  const [rating, setRating] = useState(existingLog?.rating || 0);
  const [selectedMoods, setSelectedMoods] = useState(existingLog?.moods || []);
  const [notes, setNotes] = useState(existingLog?.review || '');
  const [watchStatus, setWatchStatus] = useState(existingLog?.watch_status || 'watched');
  const [sourceUpc, setSourceUpc] = useState(existingLog?.source_upc || '');
  const [lookupResult, setLookupResult] = useState(null);
  const [isLookingUpUpc, setIsLookingUpUpc] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState('native');
  const [scannerError, setScannerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!existingLog;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const html5ScannerRef = useRef(null);
  const scannerRegionIdRef = useRef(`upc-scanner-${Math.random().toString(36).slice(2, 9)}`);
  const scannerSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  const cameraApiAvailable =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
  const effectiveMovie = lookupResult?.tmdbMovie || movie;
  const waitForElement = async (id, attempts = 12) => {
    for (let i = 0; i < attempts; i += 1) {
      const el = document.getElementById(id);
      if (el) return el;
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    }
    return null;
  };

  // Safety defaults
  const movieTitle = effectiveMovie?.title || lookupResult?.sourceTitle || 'Loading...';
  const moviePoster = effectiveMovie?.poster_path || '';
  const movieYear = effectiveMovie?.release_date?.split('-')[0] || null;

  const stopScanner = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (html5ScannerRef.current) {
      html5ScannerRef.current
        .stop()
        .catch(() => {
          // Scanner may already be stopped.
        })
        .finally(() => {
          html5ScannerRef.current?.clear().catch(() => {});
          html5ScannerRef.current = null;
        });
    }
    setIsScannerOpen(false);
  };

  useEffect(() => () => stopScanner(), []);

  const startHtml5QrcodeScanner = async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    setScannerMode('html5');
    setIsScannerOpen(true);
    const region = await waitForElement(scannerRegionIdRef.current);
    if (!region) {
      throw new Error('Scanner mount target unavailable. Please try again.');
    }
    const scanner = new Html5Qrcode(scannerRegionIdRef.current);
    html5ScannerRef.current = scanner;

    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 8,
        qrbox: { width: 260, height: 140 },
        aspectRatio: 1.777,
      },
      (decodedText) => {
        const rawValue = String(decodedText || '').replace(/[^\d]/g, '');
        if (rawValue.length < 8) return;
        setSourceUpc(rawValue);
        stopScanner();
      },
      () => {
        // Ignore per-frame decode failures.
      }
    );
  };

  const startScanner = async () => {
    setScannerError('');

    if (!window.isSecureContext) {
      setScannerError('Camera scanning requires HTTPS or localhost.');
      return;
    }
    if (!cameraApiAvailable) {
      setScannerError('This browser does not expose camera APIs (mediaDevices/getUserMedia).');
      return;
    }

    try {
      if (!scannerSupported) {
        await startHtml5QrcodeScanner();
        return;
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (_rearCameraError) {
        // Fallback for devices/browsers that reject facingMode constraints.
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      setScannerMode('native');
      setIsScannerOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const desiredFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
      const activeFormats = desiredFormats.filter((fmt) => supportedFormats.includes(fmt));
      if (activeFormats.length === 0) {
        throw new Error('No compatible native barcode formats available on this device.');
      }
      const detector = new window.BarcodeDetector({ formats: activeFormats });

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const detected = await detector.detect(videoRef.current);
          if (!detected || detected.length === 0) return;
          const rawValue = String(detected[0]?.rawValue || '').replace(/[^\d]/g, '');
          if (rawValue.length < 8) return;
          setSourceUpc(rawValue);
          stopScanner();
        } catch (_detectError) {
          // Keep scanning.
        }
      }, 450);
    } catch (scanError) {
      // Fall back to html5-qrcode when native detector setup fails.
      try {
        await startHtml5QrcodeScanner();
      } catch (fallbackError) {
        const normalizedError =
          fallbackError?.message ||
          scanError?.message ||
          'Failed to start camera scanner.';
        setScannerError(
          `${normalizedError} Check browser camera permissions for this site.`
        );
        stopScanner();
      }
    }
  };

  const handleLookupUpc = async () => {
    setError('');
    setIsLookingUpUpc(true);
    try {
      const result = await lookupMovieByUpc(sourceUpc);
      setLookupResult(result);
      if (!result.tmdbMovie) {
        setError('UPC found, but no TMDB match. You can still save with manual movie context.');
      }
    } catch (lookupError) {
      setLookupResult(null);
      setError(lookupError.message || 'UPC lookup failed.');
    } finally {
      setIsLookingUpUpc(false);
    }
  };

  const handleMoodToggle = (moodId) => {
    setSelectedMoods((prev) =>
      prev.includes(moodId)
        ? prev.filter((id) => id !== moodId)
        : [...prev, moodId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!isAuthenticated || !user?.id) {
        throw new Error('You must be logged in to log movies.');
      }

      if (!effectiveMovie?.title) {
        throw new Error('Scan or look up a barcode first so Filmgraph can identify the movie.');
      }

      const genreNames = effectiveMovie?.genres
        ? effectiveMovie.genres.map(g => typeof g === 'string' ? g : g.name)
        : [];

      const finalGenres = Array.isArray(genreNames) ? genreNames : [];

      const supabase = getSupabase();

      // Build base data — poster is a generated column, exclude it entirely
      const movieData = {
        user_id: user.id,
        title: movieTitle,
        year: movieYear ? parseInt(movieYear, 10) : null,
        rating: rating > 0 ? parseFloat(rating.toFixed(1)) : null,
        moods: selectedMoods.length > 0 ? selectedMoods : null,
        genres: finalGenres,
        review: notes || null,
        watch_status: watchStatus,
        source_upc: sourceUpc.trim() || null,
      };

      let result;
      if (isEditing) {
        // If changing from 'to-watch' to 'watched', delete the to-watch entry first
        if (existingLog.watch_status === 'to-watch' && watchStatus === 'watched') {
          await supabase
            .from('movie_logs')
            .delete()
            .eq('id', existingLog.id);
          
          // Then insert as watched
          const { data, error: insertError } = await supabase
            .from('movie_logs')
            .insert(movieData)
            .select();
          if (insertError) throw insertError;
          result = data?.[0];
        } else {
          // Normal update for other changes
          const { data, error: updateError } = await supabase
            .from('movie_logs')
            .update(movieData)
            .eq('id', existingLog.id)
            .select();
          if (updateError) throw updateError;
          result = data?.[0];
        }
      } else {
        const duplicateCheck = await checkDuplicateInCollection({
          userId: user.id,
          tmdbId: effectiveMovie?.id,
          sourceUpc,
        });
        if (duplicateCheck.isDuplicate) {
          throw new Error(`Anti-Double-Buy: ${duplicateCheck.reasons.join(' + ')}`);
        }

        movieData.tmdb_id = effectiveMovie?.id || null;
        movieData.source_upc = sourceUpc.trim() || null;
        const { data, error: insertError } = await supabase
          .from('movie_logs')
          .insert(movieData)
          .select();
        if (insertError) throw insertError;
        result = data?.[0];
      }

      onSaved?.(result);
    } catch (err) {
      const message = String(err?.message || '');
      const isNetworkError =
        !navigator.onLine ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network');

      if (!isEditing && isNetworkError) {
        try {
          const queuedPayload = {
            user_id: user.id,
            tmdb_id: effectiveMovie?.id || null,
            title: movieTitle,
            year: movieYear ? parseInt(movieYear, 10) : null,
            rating: rating > 0 ? parseFloat(rating.toFixed(1)) : null,
            moods: selectedMoods.length > 0 ? selectedMoods : null,
            genres: Array.isArray(effectiveMovie?.genres)
              ? effectiveMovie.genres.map((g) => (typeof g === 'string' ? g : g.name)).filter(Boolean)
              : [],
            review: notes || null,
            watch_status: watchStatus,
            source_upc: sourceUpc.trim() || null,
          };
          await enqueueMovieLog(queuedPayload);
          onSaved?.({
            ...queuedPayload,
            id: `offline-${Date.now()}`,
            offline_pending: true,
          });
          onClose?.();
          return;
        } catch (_queueError) {
          // Fall through to standard error path
        }
      }

      setError(err.message || 'Failed to log movie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: '999999',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '90vh',
          overflow: 'auto',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'sticky', top: '0', backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '10' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: '0' }}>{isEditing ? 'Edit Movie Log' : 'Log Movie'}</h2>
          <button onClick={onClose} style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(movie || lookupResult) && (
            <div style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: '#121212', borderRadius: '8px' }}>
              {moviePoster && (
                <img src={`https://image.tmdb.org/t/p/w92${moviePoster}`} alt={movieTitle} loading="lazy" style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', margin: '0 0 4px 0' }}>{movieTitle}</h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0' }}>{movieYear}</p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>Status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" style={{ flex: '1', padding: '8px 16px', borderRadius: '6px', fontWeight: '500', transition: 'all 0.2s', backgroundColor: watchStatus === 'watched' ? '#15803d' : '#2a2a2a', color: watchStatus === 'watched' ? '#ffffff' : '#9ca3af', border: 'none', cursor: 'pointer' }} onClick={() => setWatchStatus('watched')}>Watched</button>
              <button type="button" style={{ flex: '1', padding: '8px 16px', borderRadius: '6px', fontWeight: '500', transition: 'all 0.2s', backgroundColor: watchStatus === 'to-watch' ? '#1d4ed8' : '#2a2a2a', color: watchStatus === 'to-watch' ? '#ffffff' : '#9ca3af', border: 'none', cursor: 'pointer' }} onClick={() => setWatchStatus('to-watch')}>To Watch</button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>Your Rating</label>
            <RatingSlider value={rating} onChange={setRating} disabled={isSubmitting} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>Mood</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    backgroundColor: selectedMoods.includes(mood.id) ? '#7e22ce' : '#2a2a2a',
                    color: selectedMoods.includes(mood.id) ? '#ffffff' : '#9ca3af',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleMoodToggle(mood.id)}
                >
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>Barcode (UPC)</label>
            <input
              type="text"
              value={sourceUpc}
              onChange={(e) => setSourceUpc(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Scan or paste UPC"
              style={{ width: '100%', padding: '12px', backgroundColor: '#121212', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
              disabled={isSubmitting}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={startScanner}
                disabled={isSubmitting || isScannerOpen}
                style={{ padding: '8px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#1d4ed8', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                {isScannerOpen ? 'Scanner Running...' : 'Scan Barcode'}
              </button>
              <button
                type="button"
                onClick={handleLookupUpc}
                disabled={isSubmitting || isLookingUpUpc || !sourceUpc.trim()}
                style={{ padding: '8px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#065f46', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                {isLookingUpUpc ? 'Looking up...' : 'Lookup UPC'}
              </button>
              {isScannerOpen && (
                <button
                  type="button"
                  onClick={stopScanner}
                  style={{ padding: '8px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#7f1d1d', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Stop Scanner
                </button>
              )}
            </div>
            <div
              style={{
                marginTop: '8px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #2a2a2a',
                backgroundColor: '#101012',
                fontSize: '11px',
                color: '#a1a1aa',
                lineHeight: 1.5,
              }}
            >
              <div>
                Scanner diagnostics: secure context{' '}
                <strong style={{ color: window.isSecureContext ? '#34d399' : '#f87171' }}>
                  {window.isSecureContext ? 'yes' : 'no'}
                </strong>
                , camera API{' '}
                <strong style={{ color: cameraApiAvailable ? '#34d399' : '#f87171' }}>
                  {cameraApiAvailable ? 'available' : 'missing'}
                </strong>
                , BarcodeDetector{' '}
                <strong style={{ color: scannerSupported ? '#34d399' : '#fbbf24' }}>
                  {scannerSupported ? 'available' : 'not available'}
                </strong>
                .
              </div>
              <div>
                Mode: <strong style={{ color: '#e4e4e7' }}>{isScannerOpen ? scannerMode : 'idle'}</strong>
              </div>
            </div>
            {scannerError && (
              <p style={{ marginTop: '8px', color: '#f87171', fontSize: '12px' }}>{scannerError}</p>
            )}
            {lookupResult?.tmdbMovie && (
              <p style={{ marginTop: '8px', color: '#34d399', fontSize: '12px' }}>
                UPC matched: {lookupResult.tmdbMovie.title} ({lookupResult.tmdbMovie.release_date?.split('-')[0] || 'N/A'})
              </p>
            )}
            {isScannerOpen && (
              <div style={{ marginTop: '8px', border: '1px solid #2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
                {scannerMode === 'native' ? (
                  <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: '220px', backgroundColor: '#000' }} />
                ) : (
                  <div id={scannerRegionIdRef.current} style={{ width: '100%', minHeight: '220px', backgroundColor: '#000' }} />
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>Private Notes</label>
            <textarea style={{ width: '100%', padding: '12px', backgroundColor: '#121212', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', resize: 'vertical', minHeight: '100px' }} placeholder="Write your thoughts..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={isSubmitting} />
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #2a2a2a' }}>
            <button type="button" onClick={onClose} style={{ flex: '1', padding: '12px 16px', backgroundColor: '#2a2a2a', color: '#d1d5db', borderRadius: '6px', fontWeight: '500', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} disabled={isSubmitting}>Cancel</button>
            <button type="submit" style={{ flex: '1', padding: '12px 16px', backgroundColor: '#7e22ce', color: '#ffffff', borderRadius: '6px', fontWeight: '500', border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: isSubmitting ? '0.5' : '1' }} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Log Movie'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default LogMovieModal;
