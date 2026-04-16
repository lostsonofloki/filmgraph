import { createContext, useContext, useState, useEffect } from 'react';
import {
  getSupabase,
  setAuthStoragePreference,
  clearSupabaseAuthFromAllBuckets,
} from '../supabaseClient';

const UserContext = createContext(null);

// Store the current supabase client reference
let currentSupabase = null;

const toUserShape = (authUser) => ({
  id: authUser.id,
  email: authUser.email,
  username:
    authUser.user_metadata?.username ||
    authUser.user_metadata?.display_name ||
    authUser.email?.split('@')[0],
});

/**
 * UserProvider - Provides user authentication state to the app
 * Uses Supabase Auth for authentication
 */
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isInvalidRefreshTokenError = (error) =>
    String(error?.message || '').toLowerCase().includes('invalid refresh token');

  // Get the default supabase client on mount
  useEffect(() => {
    try {
      currentSupabase = getSupabase();
    } catch (e) {
      console.error('Failed to get Supabase client:', e);
      setIsLoading(false);
      return;
    }

    // Get initial session
    currentSupabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error && isInvalidRefreshTokenError(error)) {
        clearSupabaseAuthFromAllBuckets();
        await currentSupabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (session?.user) {
        setUser(toUserShape(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth changes — only clear user on explicit sign-out (not transient null sessions).
    const { data: { subscription } } = currentSupabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        window.sessionStorage.removeItem('filmgraph_temp_session');
        setIsLoading(false);
        return;
      }
      if (session?.user) {
        setUser(toUserShape(session.user));
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Login function - signs in with Supabase Auth
   * @param {string} email
   * @param {string} password
   * @param {boolean} rememberMe - Use localStorage (true) or sessionStorage (false)
   */
  const login = async (email, password, rememberMe = true) => {
    const supabase = getSupabase();
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    clearSupabaseAuthFromAllBuckets();
    setAuthStoragePreference(rememberMe);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      setUser(toUserShape(data.user));

      // Store flag for temporary session tracking
      if (!rememberMe) {
        window.sessionStorage.setItem('filmgraph_temp_session', 'true');
      } else {
        window.sessionStorage.removeItem('filmgraph_temp_session');
      }
    }

    return { success: true };
  };

  /**
   * Logout function - clears user session
   */
  const logout = async () => {
    if (currentSupabase) {
      await currentSupabase.auth.signOut();
    }
    clearSupabaseAuthFromAllBuckets();
    window.sessionStorage.removeItem('filmgraph_temp_session');
    setAuthStoragePreference(true);
    setUser(null);
  };

  /**
   * Update user profile
   */
  const updateUser = async (updates) => {
    if (!currentSupabase) throw new Error('Supabase client not initialized');

    const { error } = await currentSupabase.auth.updateUser({
      data: { username: updates.username, display_name: updates.display_name || updates.username },
    });

    if (error) throw error;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook to access user context
 */
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
