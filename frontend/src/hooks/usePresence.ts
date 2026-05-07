import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export const usePresence = () => {
  const { onlineUsers } = useChatStore();

  const isOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
  };

  return { isOnline, onlineUsers };
};
