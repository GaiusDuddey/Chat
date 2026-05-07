import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: string;
  mediaUrl?: string;
  replyToId?: string;
  isDeleted: boolean;
  editedAt?: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  replyTo?: {
    id: string;
    content?: string;
    sender: {
      id: string;
      username: string;
    };
  };
  statuses: Array<{
    userId: string;
    status: string;
  }>;
}

interface MessagesResponse {
  data: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const useMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<MessagesResponse>({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const params: any = { limit: 50 };
      if (pageParam) params.cursor = pageParam;

      const { data } = await client.get(
        `/conversations/${conversationId}/messages`,
        { params }
      );
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!conversationId,
    staleTime: 30000,
  });

  // Add a new message optimistically
  const addMessage = (message: Message) => {
    queryClient.setQueryData(
      ['messages', message.conversationId],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: MessagesResponse, index: number) => {
            if (index === 0) {
              // Check if message already exists
              const exists = page.data.some((m) => m.id === message.id);
              if (exists) return page;
              return {
                ...page,
                data: [message, ...page.data],
              };
            }
            return page;
          }),
        };
      }
    );
  };

  // Update a message
  const updateMessage = (
    messageId: string,
    updates: Partial<Message>
  ) => {
    queryClient.setQueryData(
      ['messages', conversationId],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: MessagesResponse) => ({
            ...page,
            data: page.data.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          })),
        };
      }
    );
  };

  // Remove a message (soft delete)
  const removeMessage = (messageId: string) => {
    updateMessage(messageId, { isDeleted: true, content: null });
  };

  return {
    ...query,
    addMessage,
    updateMessage,
    removeMessage,
  };
};

export type { Message };
