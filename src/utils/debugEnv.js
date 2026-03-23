/**
 * Environment Debug Utility
 * Call this in your browser console to check env variables
 */

export function debugEnv() {
  console.log('=== Environment Debug ===');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
  console.log('VITE_TMDB_API_KEY:', import.meta.env.VITE_TMDB_API_KEY ? '✅ Found' : '❌ Missing');
  
  console.log('\n=== Raw Values (first 20 chars) ===');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL?.substring(0, 20) + '...');
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  console.log('VITE_TMDB_API_KEY:', import.meta.env.VITE_TMDB_API_KEY?.substring(0, 20) + '...');
  
  console.log('\n=== All Import Meta Env Keys ===');
  console.log(Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
  console.log('===========================');
}

// Auto-run on import in development
if (import.meta.env.DEV) {
  debugEnv();
}
