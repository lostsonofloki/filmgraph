import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';
import {
  addMovieToList as addMovieToSharedList,
  canEditRole,
  createList as createSharedList,
  deleteList as deleteSharedList,
  getUserLists,
  inviteListMember,
  removeListMember,
  updateListMemberRole,
} from '../api/sharedLists';

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

  const getListById = useCallback(
    (listId) => lists.find((list) => list.id === listId) || null,
    [lists]
  );

  const isListOwner = useCallback(
    (listId) => getListById(listId)?.membership?.role === 'owner',
    [getListById]
  );

  const canEditList = useCallback(
    (listId) => canEditRole(getListById(listId)?.membership?.role),
    [getListById]
  );

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
      const { data, error: insertError } = await createSharedList(
        user.id,
        name.trim(),
        description.trim()
      );
      if (insertError) throw insertError;

      // Add the new list to state
      setLists((prev) => [
        {
          ...data,
          is_public: isPublic,
          list_members: [
            {
              list_id: data.id,
              user_id: user.id,
              role: 'owner',
              joined_at: new Date().toISOString(),
              profile: {
                id: user.id,
                email: user.email || null,
                username: user.username || null,
                display_name: user.username || user.email?.split('@')[0] || null,
                avatar_url: null,
              },
            },
          ],
          list_items: [],
          membership: { role: 'owner', joined_at: new Date().toISOString() },
        },
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
      const { error: deleteError } = await deleteSharedList(listId, user.id);

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
      if (!canEditList(listId)) {
        throw new Error('You have view-only access to this list.');
      }

      if (isMovieInList(listId, movie.tmdb_id)) {
        throw new Error('This movie is already in the list.');
      }

      const { data, error: insertError } = await addMovieToSharedList(
        listId,
        movie.tmdb_id,
        user.id,
        movie
      );
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
      if (!canEditList(listId)) {
        throw new Error('You have view-only access to this list.');
      }
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

  const inviteCollaborator = async (listId, identifier, role = 'editor') => {
    if (!user?.id) throw new Error('You must be logged in to invite collaborators.');

    const { data, error: inviteError } = await inviteListMember(listId, identifier, role);
    if (inviteError) throw inviteError;
    await fetchLists();
    return data;
  };

  const changeCollaboratorRole = async (listId, memberUserId, role) => {
    if (!user?.id) throw new Error('You must be logged in to change roles.');
    if (!isListOwner(listId)) throw new Error('Only list owners can change roles.');

    const { data, error: roleError } = await updateListMemberRole(listId, memberUserId, role);
    if (roleError) throw roleError;
    await fetchLists();
    return data;
  };

  const removeCollaborator = async (listId, memberUserId) => {
    if (!user?.id) throw new Error('You must be logged in to remove collaborators.');
    if (!isListOwner(listId)) throw new Error('Only list owners can remove collaborators.');

    const { error: removeError } = await removeListMember(listId, memberUserId);
    if (removeError) throw removeError;
    await fetchLists();
    return true;
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
    getListById,
    isListOwner,
    canEditList,
    fetchLists,
    createList,
    deleteList,
    updateList,
    addMovieToList,
    removeMovieFromList,
    inviteCollaborator,
    changeCollaboratorRole,
    removeCollaborator,
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
