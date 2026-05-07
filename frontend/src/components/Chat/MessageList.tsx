import React, { useRef, useEffect, useCallback } from 'react';
import { useMessages, Message } from '../../hooks/useMessages';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  conversationId: string;
  onNewMessage?: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({ conversationId }) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(conversationId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Scroll to bottom on first load or new message
  useEffect(() => {
    if (data && isFirstLoad.current) {
      bottomRef.current?.scrollIntoView();
      isFirstLoad.current = false;
    }
  }, [data]);

  // Reset on conversation change
  useEffect(() => {
    isFirstLoad.current = true;
  }, [conversationId]);

  // Infinite scroll upward
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allMessages = data?.pages.flatMap((page) => page.data).reverse() || [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-dark-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-4"
    >
      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}

      {allMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-sm text-dark-500">No messages yet</p>
          <p className="text-xs text-dark-600">Send a message to start the conversation</p>
        </div>
      ) : (
        allMessages.map((message, index) => {
          const prevMessage = index > 0 ? allMessages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={showAvatar}
            />
          );
        })
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
