import { getSupabase } from '../supabaseClient';

const ADMIN_EMAIL = 'sonofloke@gmail.com';

const cleanText = (value) => {
  if (!value) return null;
  return String(value).trim().slice(0, 500) || null;
};

export const parseLatencyMs = (latency) => {
  if (typeof latency === 'number' && Number.isFinite(latency)) {
    return Math.max(0, Math.round(latency));
  }
  if (!latency) return null;

  const match = String(latency).match(/(\d+)\s*ms/i);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : Math.max(0, value);
};

export const classifyOracleError = (error) => {
  const provider = String(error?.provider || '');
  const status = String(error?.status || '');
  const raw = String(error?.message || error || '').toLowerCase();
  const tagged = raw.match(/\[oracle:([a-z]+)(?::(\d+))?\]/i);
  const taggedProvider = tagged?.[1] || provider || null;
  const taggedStatus = tagged?.[2] || status || null;
  if (!raw) return { errorCode: null, fallbackReason: null };

  if (raw.includes('daily oracle limit')) {
    return { errorCode: 'budget_limit', fallbackReason: 'budget_limit', provider: taggedProvider, statusCode: taggedStatus };
  }
  if (raw.includes('openrouter')) {
    return { errorCode: taggedStatus === '429' ? 'openrouter_rate_limited' : 'openrouter_error', fallbackReason: 'openrouter_unavailable', provider: taggedProvider || 'openrouter', statusCode: taggedStatus };
  }
  if (raw.includes('tmdb')) {
    return { errorCode: taggedStatus === '429' ? 'tmdb_rate_limited' : 'tmdb_error', fallbackReason: 'tmdb_unavailable', provider: taggedProvider || 'tmdb', statusCode: taggedStatus };
  }
  if (raw.includes('gemini') || raw.includes('oracle is silent')) {
    return { errorCode: taggedStatus === '429' ? 'gemini_rate_limited' : 'gemini_error', fallbackReason: 'gemini_unavailable', provider: taggedProvider || 'gemini', statusCode: taggedStatus };
  }
  if (raw.includes('network') || raw.includes('fetch')) {
    return { errorCode: 'network_error', fallbackReason: 'network_error', provider: taggedProvider, statusCode: taggedStatus };
  }

  return { errorCode: 'unknown_error', fallbackReason: null, provider: taggedProvider, statusCode: taggedStatus };
};

export const buildOracleEventPayload = ({
  userId,
  meta,
  success,
  fallbackReason,
  errorCode,
  errorMessage,
  budgetSource,
  requestSource,
  promptType,
  recommendationCount = 0,
  tmdbHitCount = 0,
}) => {
  const safeRecommendations = Math.max(0, Number(recommendationCount) || 0);
  const safeHits = Math.max(0, Number(tmdbHitCount) || 0);
  const tmdbHitRate = safeRecommendations > 0 ? safeHits / safeRecommendations : 0;

  return {
    user_id: userId,
    provider: cleanText(meta?.provider) || 'unknown',
    model_used: cleanText(meta?.modelUsed),
    groq_used: Boolean(meta?.groqUsed),
    latency_ms: parseLatencyMs(meta?.latency),
    success: Boolean(success),
    fallback_reason: cleanText(fallbackReason || meta?.fallbackReason),
    error_code: cleanText(errorCode),
    error_message: cleanText(errorMessage),
    budget_source: cleanText(budgetSource),
    request_source: cleanText(requestSource),
    prompt_type: cleanText(promptType),
    recommendation_count: safeRecommendations,
    tmdb_hit_count: safeHits,
    tmdb_hit_rate: Number(tmdbHitRate.toFixed(4)),
  };
};

export const trackOracleProviderEvent = async (eventPayload) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('oracle_provider_events')
      .insert(eventPayload);

    if (error) {
      console.warn('Oracle analytics insert failed:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.warn('Oracle analytics insert threw:', error.message);
    return { success: false, error: error.message };
  }
};

export const trackOracleProviderEventSafe = (eventPayload) => {
  queueMicrotask(async () => {
    await trackOracleProviderEvent(eventPayload);
  });
};

export const isOracleAnalyticsAdmin = (user) => user?.email === ADMIN_EMAIL;
