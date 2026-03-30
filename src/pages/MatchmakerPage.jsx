import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getSupabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './MatchmakerPage.css';

// Default avatar placeholder
const DEFAULT_AVATAR = 'https://via.placeholder.com/150/7e22ce/ffffff?text=?';

/**
 * MatchmakerPage - Social compatibility feature
 * Send/accept friend requests to compare movie tastes
 */
function MatchmakerPage() {
  const { user } = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all friendship data on mount
  useEffect(() => {
    fetchFriendships();
  }, [user?.id]);

  const fetchFriendships = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const supabase = getSupabase();

      // Fetch incoming requests (pending, where user is receiver)
      const { data: incoming, error: incomingError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles:sender_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Fetch sent requests (pending, where user is sender)
      const { data: sent, error: sentError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles:receiver_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Fetch accepted friends where user is sender
      const { data: sentFriends, error: sentFriendsError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles:receiver_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('sender_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      // Fetch accepted friends where user is receiver
      const { data: receivedFriends, error: receivedFriendsError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles:sender_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;
      if (sentError) throw sentError;
      if (sentFriendsError) throw sentFriendsError;
      if (receivedFriendsError) throw receivedFriendsError;

      // Combine accepted friends from both queries
      const allFriends = [
        ...(sentFriends || []).map(f => ({ ...f, friend: f.profiles })),
        ...(receivedFriends || []).map(f => ({ ...f, friend: f.profiles }))
      ].filter(f => f.friend); // Filter out any null profiles

      setFriendRequests((incoming || []).filter(r => r.profiles)); // Filter out null profiles
      setSentRequests((sent || []).filter(r => r.receiver)); // Filter out null receivers
      setFriends(allFriends);
    } catch (err) {
      console.error('Error fetching friendships:', err);
      toast.error('Failed to load friend requests');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMatchRequest = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to send requests');
      return;
    }

    try {
      setIsSending(true);
      const supabase = getSupabase();

      // Find user by email in auth.users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('email', inviteEmail.trim())
        .single();

      if (userError || !userData) {
        toast.error('User not found. Make sure they have an Ignes account.');
        return;
      }

      // Check if request already exists
      const { data: existing, error: existingError } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userData.id}),and(sender_id.eq.${userData.id},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing friendship:', existingError);
      }

      if (existing) {
        toast.error('Request already sent to this user');
        return;
      }

      // Create friendship request
      const { data, error: insertError } = await supabase
        .from('friendships')
        .insert({
          sender_id: user.id,
          receiver_id: userData.id,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success(`Friend request sent to ${userData?.display_name || userData?.username}!`);
      setInviteEmail('');
      fetchFriendships();
    } catch (err) {
      console.error('Error sending request:', err);
      toast.error('Failed to send friend request');
    } finally {
      setIsSending(false);
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Friend request accepted!');
      fetchFriendships();
    } catch (err) {
      console.error('Error accepting request:', err);
      toast.error('Failed to accept request');
    }
  };

  const declineRequest = async (requestId) => {
    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request declined');
      fetchFriendships();
    } catch (err) {
      console.error('Error declining request:', err);
      toast.error('Failed to decline request');
    }
  };

  const cancelRequest = async (requestId) => {
    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request cancelled');
      fetchFriendships();
    } catch (err) {
      console.error('Error cancelling request:', err);
      toast.error('Failed to cancel request');
    }
  };

  return (
    <div className="matchmaker-page">
      <div className="matchmaker-container">
        {/* Header */}
        <div className="matchmaker-header">
          <h1 className="matchmaker-title font-creepster">The Matchmaker</h1>
          <p className="matchmaker-subtitle">
            Find your movie soulmate. Compare tastes, discover conflicts, and see your Synergy Score.
          </p>
        </div>

        {/* Invite Section */}
        <div className="invite-section">
          <h2 className="section-title">Invite a Friend</h2>
          <div className="invite-form">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter their email"
              className="invite-input"
              disabled={isSending}
            />
            <button
              className="invite-btn"
              onClick={sendMatchRequest}
              disabled={isSending || !inviteEmail.trim()}
            >
              {isSending ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>

        {/* Incoming Requests */}
        {friendRequests.length > 0 && (
          <div className="requests-section">
            <h2 className="section-title">Incoming Requests</h2>
            <div className="requests-list">
              {friendRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-user">
                    <img 
                      src={request.profiles?.avatar_url || DEFAULT_AVATAR} 
                      alt={request.profiles?.username || 'User'} 
                      className="user-avatar" 
                      onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                    />
                    <div className="user-info">
                      <span className="user-display-name">
                        {request.profiles?.display_name || request.profiles?.username || 'Unknown User'}
                      </span>
                      <span className="user-username">@{request.profiles?.username || 'user'}</span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button className="accept-btn" onClick={() => acceptRequest(request.id)}>
                      Accept
                    </button>
                    <button className="decline-btn" onClick={() => declineRequest(request.id)}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div className="requests-section">
            <h2 className="section-title">Sent Requests</h2>
            <div className="requests-list">
              {sentRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-user">
                    <img 
                      src={request.receiver?.avatar_url || DEFAULT_AVATAR} 
                      alt={request.receiver?.username || 'User'} 
                      className="user-avatar"
                      onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                    />
                    <div className="user-info">
                      <span className="user-display-name">
                        {request.receiver?.display_name || request.receiver?.username || 'Unknown User'}
                      </span>
                      <span className="user-username">@{request.receiver?.username || 'user'}</span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button className="cancel-btn" onClick={() => cancelRequest(request.id)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        {friends.length > 0 && (
          <div className="friends-section">
            <h2 className="section-title">Your Friends</h2>
            <div className="friends-list">
              {friends.map((friendship) => (
                <div
                  key={friendship.id}
                  className="friend-card"
                >
                  <div className="friend-user">
                    <img 
                      src={friendship.friend?.avatar_url || DEFAULT_AVATAR} 
                      alt={friendship.friend?.username || 'User'} 
                      className="user-avatar"
                      onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                    />
                    <div className="user-info">
                      <span className="user-display-name">
                        {friendship.friend?.display_name || friendship.friend?.username || 'Unknown User'}
                      </span>
                      <span className="user-username">@{friendship.friend?.username || 'user'}</span>
                    </div>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="compare-btn"
                      onClick={() => navigate(`/matchmaker/${friendship.friend?.id}`)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      Compare
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your connections...</p>
          </div>
        ) : friendRequests.length === 0 && sentRequests.length === 0 && friends.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <h3>No connections yet</h3>
            <p>Invite a friend to start comparing your movie tastes!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MatchmakerPage;
