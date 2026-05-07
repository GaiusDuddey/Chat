import { create } from 'zustand';

interface Member {
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    lastSeen?: string;
  };
}

interface LastMessage {
  id: string;
  content?: string;
  type: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  members: Member[];
  messages: LastMessage[];
  unreadCount: number;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  conversationId: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  onlineUsers: Set<string>;
  typingUsers: TypingUser[];

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateLastMessage: (conversationId: string, message: LastMessage) => void;
  setUnreadCount: (conversationId: string, count: number) => void;
  incrementUnreadCount: (conversationId: string) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  addTypingUser: (userId: string, conversationId: string) => void;
  removeTypingUser: (userId: string, conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  onlineUsers: new Set(),
  typingUsers: [],

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateLastMessage: (conversationId, message) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages: [message] } : c
      );
      // Re-sort by latest message
      updated.sort((a, b) => {
        const aTime = a.messages[0]
          ? new Date(a.messages[0].createdAt).getTime()
          : new Date(a.createdAt).getTime();
        const bTime = b.messages[0]
          ? new Date(b.messages[0].createdAt).getTime()
          : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
      return { conversations: updated };
    }),

  setUnreadCount: (conversationId, count) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: count } : c
      ),
    })),

  incrementUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ),
    })),

  setUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  addTypingUser: (userId, conversationId) =>
    set((state) => ({
      typingUsers: [
        ...state.typingUsers.filter(
          (t) => !(t.userId === userId && t.conversationId === conversationId)
        ),
        { userId, conversationId },
      ],
    })),

  removeTypingUser: (userId, conversationId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (t) => !(t.userId === userId && t.conversationId === conversationId)
      ),
    })),
}));
