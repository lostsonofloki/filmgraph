import { useState } from 'react';
import StarRating from '../components/StarRating';
import MoodChip, { MoodChipGroup, MOODS } from '../components/MoodChip';
import './ComponentsDemo.css';

/**
 * Demo page for StarRating and MoodChip components
 * Delete this file when integrating components into your app
 */
function ComponentsDemo() {
  const [rating, setRating] = useState(0);
  const [moods, setMoods] = useState([]);

  return (
    <div className="components-demo">
      <h1>Component Demo</h1>
      <p className="demo-subtitle">Preview of StarRating and MoodChip components</p>

      {/* StarRating Demo */}
      <section className="demo-section">
        <h2>StarRating Component</h2>
        
        <div className="demo-card">
          <h3>Interactive Rating</h3>
          <p>Current rating: <strong>{rating}</strong> / 5</p>
          <StarRating 
            rating={rating} 
            onRatingChange={setRating}
            size="large"
          />
        </div>

        <div className="demo-card">
          <h3>Size Variants</h3>
          <div className="demo-row">
            <span>Small:</span>
            <StarRating rating={4} readonly size="small" />
          </div>
          <div className="demo-row">
            <span>Medium:</span>
            <StarRating rating={4} readonly size="medium" />
          </div>
          <div className="demo-row">
            <span>Large:</span>
            <StarRating rating={4} readonly size="large" />
          </div>
        </div>

        <div className="demo-card">
          <h3>Readonly Mode</h3>
          <p>For displaying existing ratings (not editable)</p>
          <StarRating rating={3} readonly />
        </div>
      </section>

      {/* MoodChip Demo */}
      <section className="demo-section">
        <h2>MoodChip Component</h2>
        
        <div className="demo-card">
          <h3>Mood Selector</h3>
          <p>Selected moods: <strong>{moods.join(', ') || 'None'}</strong></p>
          <MoodChipGroup 
            selectedMoods={moods}
            onMoodsChange={setMoods}
          />
        </div>

        <div className="demo-card">
          <h3>Individual MoodChip</h3>
          <div className="demo-row" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <MoodChip moodId="happy" isSelected={false} onToggle={() => {}} />
            <MoodChip moodId="tense" isSelected onToggle={() => {}} />
            <MoodChip moodId="dark" isSelected onToggle={() => {}} />
          </div>
        </div>

        <div className="demo-card">
          <h3>Size Variants</h3>
          <div className="demo-row">
            <span>Small:</span>
            <MoodChip moodId="happy" isSelected size="small" onToggle={() => {}} />
          </div>
          <div className="demo-row">
            <span>Medium:</span>
            <MoodChip moodId="happy" isSelected size="medium" onToggle={() => {}} />
          </div>
          <div className="demo-row">
            <span>Large:</span>
            <MoodChip moodId="happy" isSelected size="large" onToggle={() => {}} />
          </div>
        </div>

        <div className="demo-card">
          <h3>All Available Moods</h3>
          <div className="all-moods-grid">
            {MOODS.map((mood) => (
              <MoodChip 
                key={mood.id} 
                moodId={mood.id} 
                isSelected={false} 
                onToggle={() => {}}
                size="small"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Usage Example */}
      <section className="demo-section">
        <h2>Usage Example</h2>
        <div className="demo-card code-example">
          <h3>How to use in your app:</h3>
          <pre>{`// StarRating
import StarRating from './components/StarRating';

function MovieCard() {
  const [userRating, setUserRating] = useState(0);
  
  return (
    <StarRating 
      rating={userRating}
      onRatingChange={setUserRating}
      size="medium"
    />
  );
}

// MoodChip
import MoodChip, { MoodChipGroup } from './components/MoodChip';

function LogMovieForm() {
  const [selectedMoods, setSelectedMoods] = useState([]);
  
  return (
    <MoodChipGroup 
      selectedMoods={selectedMoods}
      onMoodsChange={setSelectedMoods}
    />
  );
}`}</pre>
        </div>
      </section>
    </div>
  );
}

export default ComponentsDemo;
