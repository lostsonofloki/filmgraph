import { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase, setAuthStoragePreference } from '../supabaseClient';

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
    currentSupabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(toUserShape(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = currentSupabase.auth.onAuthStateChange((event, session) => {
      // Check if this is a temporary (non-remembered) session
      const isTemporary = window.sessionStorage.getItem('filmgraph_temp_session') === 'true';

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(toUserShape(session.user));
        if (isTemporary) {
          console.log('🔐 Temporary session active (will expire on tab close)');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        window.sessionStorage.removeItem('filmgraph_temp_session');
      } else if (session?.user) {
        setUser(toUserShape(session.user));
      } else {
        setUser(null);
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
    setAuthStoragePreference(rememberMe);
    const supabase = getSupabase();

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
