/**
 * Groq LPU Integration - Ultra-fast genre extraction
 * Uses llama-3.3-70b-versatile for sub-500ms vibe-to-genre translation
 * 
 * Note: llama-3.3-70b-specdec was decommissioned. 
 * See: https://console.groq.com/docs/deprecations
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Shared TMDB Genre ID mapping - exported for use in gemini.js
export const TMDB_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const GENRE_LIST = Object.entries(TMDB_GENRES)
  .map(([id, name]) => `${id}: ${name}`)
  .join(', ');

/**
 * Extract TMDB genre IDs from natural language vibe query
 * @param {string} vibe - User's natural language mood/vibe description
 * @returns {Promise<number[]>} - Array of TMDB genre IDs
 */
export const fetchGroqGenres = async (vibe) => {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  const systemPrompt = `You are a genre classification engine for a movie platform.
Your ONLY task is to map a user's mood/vibe description to relevant TMDB genre IDs.

Available TMDB Genres:
${GENRE_LIST}

Return ONLY a valid JSON object with this exact shape:
{"genre_ids":[18,878]}
NO text, NO explanation.`;

  const userMessage = `Map this vibe to genre IDs: "${vibe}"`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 50,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Groq API error: ${response.status}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq');
    }

    console.log('📝 Groq raw response:', content);
    
    const parsed = JSON.parse(content);
    
    // Handle both formats: bare array OR object with genre_ids key
    let rawIds = [];
    if (Array.isArray(parsed)) {
      rawIds = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.genre_ids)) {
      rawIds = parsed.genre_ids;
    }
    
    const genreIds = rawIds
      .map(id => {
        if (typeof id === 'number') return id;
        if (typeof id === 'string') {
          const num = parseInt(id, 10);
          return isNaN(num) ? null : num;
        }
        return null;
      })
      .filter(id => id !== null && TMDB_GENRES[id]);

    console.log(`⚡ Groq extracted genres: ${genreIds.map(id => TMDB_GENRES[id]).join(', ')}`);
    return genreIds;

  } catch (error) {
    console.error('❌ Groq genre extraction failed:', error.message);
    throw error;
  }
};
