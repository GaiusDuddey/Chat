import React, { useEffect, useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { useMessages, Message } from '../../hooks/useMessages';
import { usePresence } from '../../hooks/usePresence';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import Avatar from '../UI/Avatar';
import { formatDistanceToNow } from 'date-fns';

const ChatWindow: React.FC = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    typingUsers,
    setUnreadCount,
  } = useChatStore();
  const {
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    socket,
  } = useSocket();
  const { isOnline } = usePresence();
  const { addMessage, updateMessage, removeMessage } = useMessages(
    activeConversationId
  );

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Listen for real-time messages
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const handleMessage = ({ message }: { message: Message }) => {
      addMessage(message);

      // Update last message in conversation list
      useChatStore.getState().updateLastMessage(message.conversationId, {
        id: message.id,
        content: message.content || undefined,
        type: message.type,
        createdAt: message.createdAt,
        sender: message.sender,
      });

      // If not the active conversation, increment unread
      if (message.conversationId !== activeConversationId && message.senderId !== user?.id) {
        useChatStore.getState().incrementUnreadCount(message.conversationId);
      }
    };

    const handleMessageUpdated = (data: {
      messageId: string;
      content: string;
      editedAt: string;
    }) => {
      updateMessage(data.messageId, {
        content: data.content,
        editedAt: data.editedAt,
      });
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      removeMessage(data.messageId);
    };

    s.on('chat:message', handleMessage);
    s.on('chat:message_updated', handleMessageUpdated);
    s.on('chat:message_deleted', handleMessageDeleted);

    return () => {
      s.off('chat:message', handleMessage);
      s.off('chat:message_updated', handleMessageUpdated);
      s.off('chat:message_deleted', handleMessageDeleted);
    };
  }, [socket.current, activeConversationId, user?.id]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (!activeConversationId) return;

    joinConversation(activeConversationId);
    setUnreadCount(activeConversationId, 0);

    return () => {
      leaveConversation(activeConversationId);
    };
  }, [activeConversationId]);

  // Join all conversation rooms for notifications
  useEffect(() => {
    conversations.forEach((c) => {
      joinConversation(c.id);
    });
  }, [conversations.length]);

  const handleSend = (content: string) => {
    if (!activeConversationId) return;
    sendMessage({
      conversationId: activeConversationId,
      content,
      type: 'text',
    });
  };

  // Typing users for this conversation
  const currentTypingUsers = useMemo(() => {
    if (!activeConversationId) return [];
    return typingUsers
      .filter(
        (t) =>
          t.conversationId === activeConversationId &&
          t.userId !== user?.id
      )
      .map((t) => {
        const member = activeConversation?.members.find(
          (m) => m.userId === t.userId
        );
        return member?.user.username || 'Someone';
      });
  }, [typingUsers, activeConversationId, user?.id, activeConversation]);

  // No conversation selected
  if (!activeConversationId || !activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center glass-panel rounded-none rounded-r-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 rounded-3xl gradient-accent flex items-center justify-center">
            <svg className="w-12 h-12 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-dark-200 mb-1">
              Welcome to RealChat
            </h2>
            <p className="text-sm text-dark-500 max-w-sm">
              Select a conversation from the sidebar or search for users to start
              a new chat
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Conversation header info
  const otherMember =
    activeConversation.type === 'direct'
      ? activeConversation.members.find((m) => m.userId !== user?.id)
      : null;

  const displayName =
    activeConversation.type === 'group'
      ? activeConversation.name || 'Group Chat'
      : otherMember?.user.username || 'Unknown';

  const avatarUrl =
    activeConversation.type === 'group'
      ? activeConversation.avatarUrl
      : otherMember?.user.avatarUrl;

  const statusText = (() => {
    if (activeConversation.type === 'group') {
      return `${activeConversation.members.length} members`;
    }
    if (otherMember && isOnline(otherMember.userId)) {
      return 'Online';
    }
    if (otherMember?.user.lastSeen) {
      return `Last seen ${formatDistanceToNow(new Date(otherMember.user.lastSeen), { addSuffix: true })}`;
    }
    return 'Offline';
  })();

  const isOtherOnline = otherMember ? isOnline(otherMember.userId) : false;

  return (
    <div className="flex-1 flex flex-col glass-panel rounded-none rounded-r-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-5 py-3 border-b border-dark-700/30 flex items-center gap-3">
        <Avatar
          name={displayName}
          src={avatarUrl}
          size="md"
          isOnline={activeConversation.type === 'direct' ? isOtherOnline : undefined}
        />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-dark-100">{displayName}</h2>
          <p
            className={`text-xs ${
              (activeConversation.type === 'direct' && isOtherOnline)
                ? 'text-emerald-400'
                : 'text-dark-500'
            }`}
          >
            {statusText}
          </p>
        </div>
      </div>

      {/* Messages */}
      <MessageList conversationId={activeConversationId} />

      {/* Typing indicator */}
      <TypingIndicator usernames={currentTypingUsers} />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTypingStart={() => startTyping(activeConversationId)}
        onTypingStop={() => stopTyping(activeConversationId)}
      />
    </div>
  );
};

export default ChatWindow;
