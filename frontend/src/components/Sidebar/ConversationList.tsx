import React, { useEffect, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import ConversationItem from './ConversationItem';
import SearchUsers from './SearchUsers';
import Avatar from '../UI/Avatar';

const ConversationList: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
  } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await client.get('/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    try {
      const { data } = await client.post('/conversations', {
        type: 'direct',
        memberIds: [userId],
      });

      // Check if conversation already exists in the list
      const existing = conversations.find((c) => c.id === data.id);
      if (!existing) {
        addConversation({ ...data, messages: [], unreadCount: 0 });
      }

      setActiveConversation(data.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      await client.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors on logout
    }
    logout();
  };

  return (
    <div className="w-80 h-full flex flex-col glass-panel border-r border-dark-700/50 rounded-none rounded-l-2xl">
      {/* Header */}
      <div className="p-4 border-b border-dark-700/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={user?.username || 'U'} src={user?.avatarUrl} size="md" />
            <div>
              <h2 className="text-sm font-semibold text-dark-100">
                {user?.username}
              </h2>
              <p className="text-xs text-emerald-400">Online</p>
            </div>
          </div>

          <button
            id="logout-button"
            onClick={handleLogout}
            className="btn-ghost p-2 rounded-lg"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <SearchUsers onSelectUser={handleSelectUser} />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-sm text-dark-500">Loading chats...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-dark-800/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-sm text-dark-500">No conversations yet</p>
            <p className="text-xs text-dark-600">
              Search for users to start chatting
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onClick={() => setActiveConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
