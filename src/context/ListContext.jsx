import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';
import { getUserLists } from '../api/sharedLists';

const ListContext = createContext(null);

/**
 * ListProvider - Provides custom lists functionality to the app
 * Handles fetching, creating, and managing user movie lists
 */
export function ListProvider({ children }) {
  const { user } = useUser();
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch all lists for the current user
   */
  const fetchLists = useCallback(async () => {
    if (!user?.id) {
      setLists([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await getUserLists(user.id);

      if (fetchError) throw fetchError;

      setLists(data || []);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
      setError(err.message);
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch lists when user changes
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  /**
   * Create a new list
   * @param {string} name - List name
   * @param {string} description - List description (optional)
   * @param {boolean} isPublic - Whether list is public (default: false)
   */
  const createList = async (name, description = '', isPublic = false) => {
    if (!user?.id) {
      throw new Error('You must be logged in to create a list.');
    }

    if (!name || name.trim() === '') {
      throw new Error('List name is required.');
    }

    try {
      const { data, error: insertError } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
          is_public: isPublic,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: memberError } = await supabase.from('list_members').insert({
        list_id: data.id,
        user_id: user.id,
        role: 'owner',
      });

      if (memberError) {
        await supabase.from('lists').delete().eq('id', data.id);
        throw memberError;
      }

      // Add the new list to state
      setLists((prev) => [
        { ...data, list_items: [], membership: { role: 'owner', joined_at: new Date().toISOString() } },
        ...prev,
      ]);

      return data;
    } catch (err) {
      console.error('Failed to create list:', err);
      throw err;
    }
  };

  /**
   * Delete a list
   * @param {string} listId - ID of the list to delete
   */
  const deleteList = async (listId) => {
    if (!user?.id) {
      throw new Error('You must be logged in to delete a list.');
    }

    try {
      const { error: deleteError } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user.id); // Ensure user owns the list

      if (deleteError) throw deleteError;

      // Remove the list from state
      setLists((prev) => prev.filter((list) => list.id !== listId));
    } catch (err) {
      console.error('Failed to delete list:', err);
      throw err;
    }
  };

  /**
   * Update a list
   * @param {string} listId - ID of the list to update
   * @param {Object} updates - Fields to update (name, description, is_public)
   */
  const updateList = async (listId, updates) => {
    if (!user?.id) {
      throw new Error('You must be logged in to update a list.');
    }

    try {
      const { data, error: updateError } = await supabase
        .from('lists')
        .update({
          ...updates,
        })
        .eq('id', listId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update the list in state
      setLists((prev) =>
        prev.map((list) => (list.id === listId ? { ...list, ...data } : list))
      );

      return data;
    } catch (err) {
      console.error('Failed to update list:', err);
      throw err;
    }
  };

  /**
   * Add a movie to a list
   * @param {string} listId - ID of the list
   * @param {Object} movie - Movie object with tmdb_id, title, poster_path
   */
  const addMovieToList = async (listId, movie) => {
    if (!user?.id) {
      throw new Error('You must be logged in to add movies to lists.');
    }

    if (!movie?.tmdb_id) {
      throw new Error('Movie must have a TMDB ID.');
    }

    try {
      // Check if movie already exists in the list
      const { data: existing, error: checkError } = await supabase
        .from('list_items')
        .select('id')
        .eq('list_id', listId)
        .eq('tmdb_id', movie.tmdb_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw checkError;
      }

      if (existing) {
        throw new Error('This movie is already in the list.');
      }

      const { data, error: insertError } = await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          added_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update the list in state to include the new item
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? { ...list, list_items: [...(list.list_items || []), data] }
            : list
        )
      );

      return data;
    } catch (err) {
      console.error('Failed to add movie to list:', err);
      throw err;
    }
  };

  /**
   * Remove a movie from a list
   * @param {string} listId - ID of the list
   * @param {number} tmdbId - TMDB ID of the movie to remove
   */
  const removeMovieFromList = async (listId, tmdbId) => {
    if (!user?.id) {
      throw new Error('You must be logged in to remove movies from lists.');
    }

    try {
      const { error: deleteError } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('tmdb_id', tmdbId);

      if (deleteError) throw deleteError;

      // Update the list in state to remove the item
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                list_items: (list.list_items || []).filter(
                  (item) => item.tmdb_id !== tmdbId
                ),
              }
            : list
        )
      );
    } catch (err) {
      console.error('Failed to remove movie from list:', err);
      throw err;
    }
  };

  /**
   * Check if a movie is in a specific list
   * @param {string} listId - ID of the list
   * @param {number} tmdbId - TMDB ID of the movie
   * @returns {boolean} - True if movie is in the list
   */
  const isMovieInList = (listId, tmdbId) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return false;
    return (list.list_items || []).some((item) => item.tmdb_id === tmdbId);
  };

  /**
   * Get all lists that contain a specific movie
   * @param {number} tmdbId - TMDB ID of the movie
   * @returns {Array} - Array of lists containing the movie
   */
  const getListsContainingMovie = (tmdbId) => {
    return lists.filter((list) =>
      (list.list_items || []).some((item) => item.tmdb_id === tmdbId)
    );
  };

  const value = {
    lists,
    isLoading,
    error,
    fetchLists,
    createList,
    deleteList,
    updateList,
    addMovieToList,
    removeMovieFromList,
    isMovieInList,
    getListsContainingMovie,
  };

  return <ListContext.Provider value={value}>{children}</ListContext.Provider>;
}

/**
 * Hook to access list context
 */
export function useLists() {
  const context = useContext(ListContext);
  if (!context) {
    throw new Error('useLists must be used within a ListProvider');
  }
  return context;
}

export default ListContext;
