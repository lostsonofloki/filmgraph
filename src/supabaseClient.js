import { createClient } from '@supabase/supabase-js';

// Check for environment variables with both prefixes (Vite and Create React App)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const AUTH_STORAGE_PREF_KEY = 'filmgraph_auth_storage';

/**
 * Remove Supabase session payloads from both persistence buckets.
 * Prevents "split brain" when toggling Remember Me or after logout (orphaned sb-* keys).
 * Also clears legacy `filmgraph.supabase.auth` if present from earlier builds.
 */
export function clearSupabaseAuthFromAllBuckets() {
  const shouldRemove = (key) =>
    typeof key === 'string' &&
    (key.startsWith('sb-') || key === 'filmgraph.supabase.auth');

  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const toRemove = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i);
        if (k && shouldRemove(k)) toRemove.push(k);
      }
      toRemove.forEach((k) => store.removeItem(k));
    } catch {
      /* private mode / blocked storage */
    }
  }
}

const getPreferredStorage = () => {
  const preference = window.localStorage.getItem(AUTH_STORAGE_PREF_KEY);
  return preference === 'session' ? window.sessionStorage : window.localStorage;
};

export const setAuthStoragePreference = (useLocalStorage = true) => {
  if (useLocalStorage) {
    window.localStorage.setItem(AUTH_STORAGE_PREF_KEY, 'local');
  } else {
    window.localStorage.setItem(AUTH_STORAGE_PREF_KEY, 'session');
  }
};

// Custom storage wrapper for dynamic persistence (localStorage vs sessionStorage)
class SupabaseStorageAdapter {
  getItem(key) {
    return getPreferredStorage().getItem(key);
  }

  setItem(key, value) {
    getPreferredStorage().setItem(key, value);
  }

  removeItem(key) {
    getPreferredStorage().removeItem(key);
  }
}

// Validate configuration
let supabase;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Default to localStorage (persist across browser closes)
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: new SupabaseStorageAdapter(),
      },
    });
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
    supabase = null;
  }
} else {
  console.warn('Supabase client not initialized - missing configuration');
  console.warn('Please check your .env file and restart the dev server');
}

// Export a wrapper that checks if client is ready
export const getSupabase = () => {
  if (!supabase) {
    const errorMsg = 'Supabase client not initialized. Check your .env file and restart dev server.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return supabase;
};

// Export function to create client with custom storage (for Remember Me toggle)
export const createSupabaseWithStorage = (useLocalStorage = true) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  setAuthStoragePreference(useLocalStorage);
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: new SupabaseStorageAdapter(),
    },
  });
};

// Export the client directly for convenience (may be undefined if not configured)
export { supabase };

export default supabase;
