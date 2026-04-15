import { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';

const UserContext = createContext(null);

// Store the current supabase client reference
let currentSupabase = null;

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
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
        });
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = currentSupabase.auth.onAuthStateChange((event, session) => {
      // Check if this is a temporary (non-remembered) session
      const isTemporary = window.sessionStorage.getItem('filmgraph_temp_session') === 'true';

      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
        });
        if (isTemporary) {
          console.log('🔐 Temporary session active (will expire on tab close)');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        window.sessionStorage.removeItem('filmgraph_temp_session');
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
        });
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
    const supabase = getSupabase();

    // Use persistSession option to control session persistence
    // If rememberMe is false, session will be cleared when browser/tab closes
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: rememberMe
      }
    });

    if (error) throw error;

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email,
        username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
      });

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
    setUser(null);
  };

  /**
   * Update user profile
   */
  const updateUser = async (updates) => {
    if (!currentSupabase) throw new Error('Supabase client not initialized');
    
    const { error } = await currentSupabase.auth.updateUser({
      data: { username: updates.username },
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
