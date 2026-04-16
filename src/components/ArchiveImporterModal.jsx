import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import { parseArchiveWithGroq, verifyBatchWithTMDB, batchSaveMovies } from '../utils/importer';
import { createPortal } from 'react-dom';
import './ArchiveImporterModal.css';

const STEPS = {
  INPUT: 'input',
  VERIFYING: 'verifying',
  REVIEW: 'review',
  COMPLETE: 'complete',
};

/**
 * Archive Importer Modal
 * 3-step workflow: Input -> Verify -> Review -> Save
 */
function ArchiveImporterModal({ onClose, onImportComplete }) {
  const { user } = useUser();
  const [step, setStep] = useState(STEPS.INPUT);
  const [rawText, setRawText] = useState('');
  const [parsedMovies, setParsedMovies] = useState([]);
  const [verifiedMovies, setVerifiedMovies] = useState([]);
  const [selectedForImport, setSelectedForImport] = useState(new Set());
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [importWatchStatus, setImportWatchStatus] = useState('to-watch');
  const [userLists, setUserLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');

  // Fetch user's custom lists
  useEffect(() => {
    const fetchLists = async () => {
      if (!user?.id) return;
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('lists')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setUserLists(data || []);
      } catch (err) {
        console.error('Error fetching lists:', err);
      }
    };
    fetchLists();
  }, [user?.id]);

  // Step 1: Parse text with Groq
  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Please paste a movie list');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const parsed = await parseArchiveWithGroq(rawText);
      setParsedMovies(parsed);
      setStep(STEPS.VERIFYING);

      // Auto-verify with TMDB
      const verified = await verifyBatchWithTMDB(parsed);
      setVerifiedMovies(verified);

      // Pre-select all found movies
      const foundIndices = verified
        .map((m, i) => m.status === 'found' ? i : -1)
        .filter(i => i !== -1);
      setSelectedForImport(new Set(foundIndices));

      setStep(STEPS.REVIEW);
    } catch (err) {
      setError(err.message || 'Failed to parse movie list');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle movie selection for import
  const toggleSelection = (index) => {
    setSelectedForImport((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Select all found movies
  const selectAll = () => {
    const foundIndices = verifiedMovies
      .map((m, i) => m.status === 'found' ? i : -1)
      .filter(i => i !== -1);
    setSelectedForImport(new Set(foundIndices));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedForImport(new Set());
  };

  // Step 3: Save selected movies
  const handleImport = async () => {
    if (selectedForImport.size === 0) {
      setError('Please select at least one movie to import');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const confirmedMovies = Array.from(selectedForImport).map((index) => ({
        tmdb: verifiedMovies[index].tmdb,
        watch_status: importWatchStatus,
        rating: 0,
        moods: [],
        review: '',
      }));

      const supabase = getSupabase();
      const stats = await batchSaveMovies(confirmedMovies, user.id, supabase);

      // If a list is selected, add all imported movies to that list
      if (selectedListId) {
        const listItemsToAdd = confirmedMovies.map(movie => ({
          list_id: selectedListId,
          tmdb_id: movie.tmdb.id,
          title: movie.tmdb.title,
          poster_path: movie.tmdb.poster_path,
          added_by: user.id,
        }));

        // Batch insert into list_items (ignore duplicates)
        let { error: listError } = await supabase
          .from('list_items')
          .upsert(listItemsToAdd, {
            onConflict: 'list_id, tmdb_id',
            ignoreDuplicates: true
          });

        const isAddedByColumnError = (supabaseError) => {
          const message = String(supabaseError?.message || '').toLowerCase();
          const details = String(supabaseError?.details || '').toLowerCase();
          const code = String(supabaseError?.code || '').toUpperCase();
          return (
            message.includes('added_by') ||
            details.includes('added_by') ||
            code === 'PGRST204'
          );
        };

        if (listError && isAddedByColumnError(listError)) {
          const fallbackItems = listItemsToAdd.map(({ added_by, ...item }) => item);
          const fallback = await supabase
            .from('list_items')
            .upsert(fallbackItems, {
              onConflict: 'list_id, tmdb_id',
              ignoreDuplicates: true
            });
          listError = fallback.error;
        }

        if (listError) {
          console.error('Error adding to list:', listError);
        }
      }

      setImportStats(stats);
      setStep(STEPS.COMPLETE);
    } catch (err) {
      setError(err.message || 'Failed to import movies');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (onImportComplete && importStats) {
      onImportComplete(importStats);
    }
    onClose();
  };

  return createPortal(
    <div className="modal-overlay archive-importer-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📦 Archive Importer</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {/* STEP 1: INPUT */}
          {step === STEPS.INPUT && (
            <div className="step-input">
              <p className="step-description">
                Paste your movie list from Letterboxd, notes, or any text format.
                We'll extract the titles and years automatically.
              </p>

              <div className="import-options">
                <label className="import-option-label">
                  <strong>Import as:</strong>
                  <select
                    value={importWatchStatus}
                    onChange={(e) => setImportWatchStatus(e.target.value)}
                    className="watch-status-select"
                  >
                    <option value="watched">✅ Watched</option>
                    <option value="to-watch">📋 Want to Watch</option>
                  </select>
                </label>

                {userLists.length > 0 && (
                  <label className="import-option-label">
                    <strong>Add to List:</strong>
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="watch-status-select"
                    >
                      <option value="">None (import only)</option>
                      {userLists.map(list => (
                        <option key={list.id} value={list.id}>{list.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <textarea
                className="raw-text-input"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Example:
The Shawshank Redemption (1994) ★★★★☆
Pulp Fiction, 1994
Watched: Inception (2010) - loved it!
The Matrix (1999)`}
                rows={12}
                disabled={isProcessing}
              />

              {error && <div className="error-message">{error}</div>}

              <div className="step-actions">
                <button className="btn-secondary" onClick={handleClose}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleParse}
                  disabled={isProcessing || !rawText.trim()}
                >
                  {isProcessing ? '⏳ Parsing...' : '✨ Parse List'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFYING */}
          {step === STEPS.VERIFYING && (
            <div className="step-verifying">
              <div className="loading-spinner"></div>
              <p>Verifying movies with TMDB...</p>
              <p className="loading-subtext">
                Found {parsedMovies.length} movies • Checking availability...
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {step === STEPS.REVIEW && (
            <div className="step-review">
              <div className="review-header">
                <h3>Review & Select</h3>
                <div className="review-actions">
                  <button className="btn-text" onClick={selectAll}>Select All</button>
                  <button className="btn-text" onClick={deselectAll}>Deselect All</button>
                </div>
              </div>

              <p className="step-description">
                {selectedForImport.size} of {verifiedMovies.length} movies selected
              </p>

              <div className="review-grid">
                {verifiedMovies.map((movie, index) => (
                  <div
                    key={index}
                    className={`review-card ${movie.status !== 'found' ? 'not-found' : ''} ${
                      selectedForImport.has(index) ? 'selected' : ''
                    }`}
                    onClick={() => movie.status === 'found' && toggleSelection(index)}
                  >
                    <div className="card-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedForImport.has(index)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(index);
                        }}
                        disabled={movie.status !== 'found'}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="card-poster">
                      {movie.tmdb?.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.tmdb.poster_path}`}
                          alt={movie.tmdb.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="poster-placeholder">No Poster</div>
                      )}
                    </div>

                    <div className="card-info">
                      <div className="parsed-title">
                        <strong>Parsed:</strong> {movie.parsed.title} ({movie.parsed.year})
                      </div>
                      {movie.tmdb && (
                        <div className="tmdb-title">
                          <strong>TMDB:</strong> {movie.tmdb.title} ({movie.tmdb.release_date?.split('-')[0]})
                        </div>
                      )}
                      {movie.status === 'not_found' && (
                        <div className="status-not-found">⚠️ Not found on TMDB</div>
                      )}
                      {movie.status === 'error' && (
                        <div className="status-error">❌ Error: {movie.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="step-actions">
                <button className="btn-secondary" onClick={() => setStep(STEPS.INPUT)}>Back</button>
                <button
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={isProcessing || selectedForImport.size === 0}
                >
                  {isProcessing ? '⏳ Importing...' : `📥 Import ${selectedForImport.size} Movies`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE */}
          {step === STEPS.COMPLETE && (
            <div className="step-complete">
              <div className="success-icon">✅</div>
              <h3>Import Complete!</h3>
              <div className="import-stats">
                <div className="stat">
                  <span className="stat-value">{importStats?.success || 0}</span>
                  <span className="stat-label">Saved</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{importStats?.skipped || 0}</span>
                  <span className="stat-label">Skipped</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{importStats?.errors || 0}</span>
                  <span className="stat-label">Errors</span>
                </div>
              </div>
              <button className="btn-primary" onClick={handleClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ArchiveImporterModal;
