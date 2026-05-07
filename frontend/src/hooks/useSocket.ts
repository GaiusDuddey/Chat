import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();
  const {
    setUserOnline,
    setUserOffline,
    addTypingUser,
    removeTypingUser,
    updateLastMessage,
    incrementUnreadCount,
    activeConversationId,
  } = useChatStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    // Presence events
    socket.on('user:online', ({ userId }) => {
      setUserOnline(userId);
    });

    socket.on('user:offline', ({ userId }) => {
      setUserOffline(userId);
    });

    // Typing events
    socket.on('chat:typing', ({ userId, conversationId, isTyping }) => {
      if (isTyping) {
        addTypingUser(userId, conversationId);
      } else {
        removeTypingUser(userId, conversationId);
      }
    });

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat');
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('chat:join', { conversationId });
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('chat:leave', { conversationId });
  }, []);

  const sendMessage = useCallback(
    (data: {
      conversationId: string;
      content: string;
      type?: string;
      mediaUrl?: string;
      replyToId?: string;
    }) => {
      socketRef.current?.emit('chat:message', data);
    },
    []
  );

  const startTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('chat:typing_start', { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('chat:typing_stop', { conversationId });
  }, []);

  const markAsRead = useCallback(
    (conversationId: string, lastMessageId: string) => {
      socketRef.current?.emit('chat:read', { conversationId, lastMessageId });
    },
    []
  );

  return {
    socket: socketRef,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
};
