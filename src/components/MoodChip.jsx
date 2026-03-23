import './MoodChip.css';

// Mood palette organized by category with color variants
export const MOODS = [
  // Emotional (Warm: Red/Orange)
  { id: 'bittersweet', label: 'Bittersweet', emoji: '🥀', category: 'emotional' },
  { id: 'heartwarming', label: 'Heartwarming', emoji: '💕', category: 'emotional' },
  { id: 'tearjerker', label: 'Tear-jerker', emoji: '😢', category: 'emotional' },
  { id: 'uplifting', label: 'Uplifting', emoji: '✨', category: 'emotional' },
  
  // Vibe-Based (Cool: Blue/Purple)
  { id: 'atmospheric', label: 'Atmospheric', emoji: '🌫️', category: 'vibe' },
  { id: 'dark', label: 'Dark', emoji: '🌑', category: 'vibe' },
  { id: 'gritty', label: 'Gritty', emoji: '🪨', category: 'vibe' },
  { id: 'neon', label: 'Neon-soaked', emoji: '🌃', category: 'vibe' },
  { id: 'tense', label: 'Tense', emoji: '😰', category: 'vibe' },
  { id: 'whimsical', label: 'Whimsical', emoji: '🦋', category: 'vibe' },
  
  // Intellectual (Slate: Grey/Steel)
  { id: 'mindbending', label: 'Mind-bending', emoji: '🌀', category: 'intellectual' },
  { id: 'challenging', label: 'Challenging', emoji: '🧗', category: 'intellectual' },
  { id: 'philosophical', label: 'Philosophical', emoji: '🤔', category: 'intellectual' },
  { id: 'slowburn', label: 'Slow-burn', emoji: '🐌', category: 'intellectual' },
  { id: 'complex', label: 'Complex', emoji: '🧩', category: 'intellectual' },
];

// Category labels and colors
export const MOOD_CATEGORIES = {
  emotional: { label: 'Emotional', color: 'warm' },
  vibe: { label: 'Vibe', color: 'cool' },
  intellectual: { label: 'Intellectual', color: 'slate' },
};

/**
 * MoodChip Component
 * Toggleable mood button with category-based coloring
 * @param {Object} props
 * @param {string} props.moodId - The mood identifier
 * @param {boolean} props.isSelected - Whether this mood is currently selected
 * @param {Function} props.onToggle - Callback when mood is toggled
 * @param {string} props.size - 'small' | 'medium' | 'large'
 * @param {string} props.className - Additional CSS classes
 */
function MoodChip({ 
  moodId, 
  isSelected = false, 
  onToggle,
  size = 'medium',
  className = ''
}) {
  const mood = MOODS.find((m) => m.id === moodId);
  
  if (!mood) {
    return null;
  }

  const handleClick = () => {
    if (onToggle) {
      onToggle(moodId);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      className={`mood-chip mood-chip-${size} mood-chip-${mood.category} ${isSelected ? 'selected' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
      role="switch"
      aria-checked={isSelected}
      aria-label={mood.label}
    >
      <span className="mood-emoji">{mood.emoji}</span>
      <span className="mood-label">{mood.label}</span>
    </button>
  );
}

/**
 * MoodChipGroup Component
 * Manages multiple MoodChips with array of selected moods
 * @param {Object} props
 * @param {string[]} props.selectedMoods - Array of selected mood IDs
 * @param {Function} props.onMoodsChange - Callback with updated moods array
 * @param {string} props.size - 'small' | 'medium' | 'large'
 * @param {string[]} props.availableMoods - Array of mood IDs to display (default: all)
 */
export function MoodChipGroup({ 
  selectedMoods = [], 
  onMoodsChange,
  size = 'medium',
  availableMoods = MOODS.map(m => m.id)
}) {
  const handleToggle = (moodId) => {
    if (!onMoodsChange) return;

    if (selectedMoods.includes(moodId)) {
      // Remove mood
      onMoodsChange(selectedMoods.filter((id) => id !== moodId));
    } else {
      // Add mood
      onMoodsChange([...selectedMoods, moodId]);
    }
  };

  return (
    <div className="mood-chip-group" role="group" aria-label="Select your mood">
      {availableMoods.map((moodId) => (
        <MoodChip
          key={moodId}
          moodId={moodId}
          isSelected={selectedMoods.includes(moodId)}
          onToggle={handleToggle}
          size={size}
        />
      ))}
    </div>
  );
}

export default MoodChip;
