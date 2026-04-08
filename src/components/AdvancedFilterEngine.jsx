import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import { buildMovieQuery } from '../utils/queryBuilder';
import { saveFilterPreset, loadFilterPreset, fetchUserPresets, deleteFilterPreset } from '../utils/filterPresets';
import './AdvancedFilterEngine.css';

const TMDB_GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 99, name: 'Documentary' },
  { id: 36, name: 'History' },
  { id: 10402, name: 'Music' },
  { id: 10751, name: 'Family' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

const MOOD_OPTIONS = [
  'atmospheric', 'dark', 'tense', 'mindbending', 'psychological',
  'uplifting', 'bleak', 'epic', 'cerebral', 'nostalgic',
  'bittersweet', 'romantic', 'feel-good', 'heart-wrenching', 'inspiring',
  'gory', 'eerie', 'claustrophobic', 'campy', 'dread',
  'jump-scary', 'adrenaline-fueled', 'hilarious', 'stylized', 'satirical',
  'technological', 'profound', 'political',
];

const initialFilterState = {
  genres: [],
  releaseYear: '',
  mood: '',
  minRating: '',
  searchTerm: '',
};

function AdvancedFilterEngine({ onResults, onError }) {
  const { user } = useUser();
  const [filters, setFilters] = useState(initialFilterState);
  const [isApplying, setIsApplying] = useState(false);
  const [presets, setPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  // Load presets on mount
  useEffect(() => {
    if (!user?.id) return;
    fetchUserPresets(user.id)
      .then(setPresets)
      .catch((err) => console.error('Failed to load presets:', err));
  }, [user?.id]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleGenre = useCallback((genreId) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter((id) => id !== genreId)
        : [...prev.genres, genreId],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  const handleApplyFilters = async () => {
    if (!user?.id) {
      onError?.('You must be logged in to filter.');
      return;
    }

    setIsApplying(true);
    try {
      const supabase = getSupabase();
      const query = supabase.from('movie_logs').select('*').eq('user_id', user.id);
      buildMovieQuery(query, filters);

      const { data, error } = await query;
      if (error) throw error;
      onResults?.(data);
    } catch (err) {
      onError?.(err.message || 'Failed to apply filters.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      onError?.('Preset name is required.');
      return;
    }

    setIsSavingPreset(true);
    try {
      const result = await saveFilterPreset(user.id, presetName.trim(), filters);
      setPresets((prev) => [result, ...prev]);
      setPresetName('');
    } catch (err) {
      onError?.(err.message || 'Failed to save preset.');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleLoadPreset = async (preset) => {
    try {
      const loadedFilters = await loadFilterPreset(preset.id);
      setFilters(loadedFilters);
      setShowPresets(false);
    } catch (err) {
      onError?.(err.message || 'Failed to load preset.');
    }
  };

  const handleDeletePreset = async (presetId, e) => {
    e.stopPropagation();
    try {
      await deleteFilterPreset(presetId);
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err) {
      onError?.(err.message || 'Failed to delete preset.');
    }
  };

  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.releaseYear ||
    filters.mood ||
    filters.minRating ||
    filters.searchTerm;

  return (
    <div className="advanced-filter-engine">
      {/* Preset Bar */}
      <div className="filter-preset-bar">
        <button
          className="preset-toggle-btn"
          onClick={() => setShowPresets(!showPresets)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17,21 17,13 7,13 7,21" />
            <polyline points="7,3 7,8 15,8" />
          </svg>
          Presets ({presets.length})
        </button>
        {showPresets && (
          <div className="preset-dropdown">
            {presets.length === 0 ? (
              <p className="preset-empty">No saved presets yet. Apply filters and save one below.</p>
            ) : (
              presets.map((preset) => (
                <div key={preset.id} className="preset-item">
                  <button
                    className="preset-item-btn"
                    onClick={() => handleLoadPreset(preset)}
                  >
                    {preset.preset_name}
                  </button>
                  <button
                    className="preset-item-delete"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    title="Delete preset"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
            <div className="preset-save-row">
              <input
                type="text"
                placeholder="Preset name..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="preset-name-input"
              />
              <button
                className="preset-save-btn"
                onClick={handleSavePreset}
                disabled={isSavingPreset || !presetName.trim() || !hasActiveFilters}
              >
                {isSavingPreset ? 'Saving...' : 'Save Current'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Term */}
      <div className="filter-group-wide">
        <label htmlFor="filter-search">Search (title, notes)</label>
        <input
          id="filter-search"
          type="text"
          placeholder="e.g. Nolan, heist, dystopia..."
          value={filters.searchTerm}
          onChange={(e) => updateFilter('searchTerm', e.target.value)}
          className="filter-input-wide"
        />
      </div>

      {/* Genres */}
      <div className="filter-group">
        <label>Genres</label>
        <div className="genre-chips">
          {TMDB_GENRES.map((genre) => (
            <button
              key={genre.id}
              type="button"
              className={`genre-chip ${filters.genres.includes(genre.id) ? 'active' : ''}`}
              onClick={() => toggleGenre(genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {/* Release Year + Min Rating */}
      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="filter-year">Release Year</label>
          <input
            id="filter-year"
            type="text"
            placeholder="e.g. > 2000, 2015, <= 1990"
            value={filters.releaseYear}
            onChange={(e) => updateFilter('releaseYear', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="filter-min-rating">Min Rating</label>
          <input
            id="filter-min-rating"
            type="text"
            placeholder="e.g. >= 4, > 3.5"
            value={filters.minRating}
            onChange={(e) => updateFilter('minRating', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="filter-mood">Mood</label>
          <select
            id="filter-mood"
            value={filters.mood}
            onChange={(e) => updateFilter('mood', e.target.value)}
            className="filter-select"
          >
            <option value="">Any mood</option>
            {MOOD_OPTIONS.map((mood) => (
              <option key={mood} value={mood}>{mood}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="filter-actions">
        {hasActiveFilters && (
          <button className="filter-clear-btn" onClick={clearFilters}>
            Clear All
          </button>
        )}
        <button
          className="filter-apply-btn"
          onClick={handleApplyFilters}
          disabled={isApplying || !hasActiveFilters}
        >
          {isApplying ? 'Filtering...' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
}

export default AdvancedFilterEngine;
