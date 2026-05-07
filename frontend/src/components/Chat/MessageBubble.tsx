import React from 'react';
import { Message } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../UI/Avatar';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
}) => {
  const { user } = useAuthStore();
  const isMine = message.senderId === user?.id;

  if (message.isDeleted) {
    return (
      <div
        className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-4 py-0.5`}
      >
        <div className="px-4 py-2 rounded-2xl bg-dark-800/30 border border-dark-700/20">
          <p className="text-xs text-dark-600 italic">
            🚫 This message was deleted
          </p>
        </div>
      </div>
    );
  }

  // Message status icons
  const getStatusIcon = () => {
    if (!isMine) return null;

    const allRead = message.statuses?.every((s) => s.status === 'read');
    const allDelivered = message.statuses?.length > 0;

    if (allRead) {
      return (
        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12l5 5L17 6M7 12l5 5L23 6" />
        </svg>
      );
    }

    if (allDelivered) {
      return (
        <svg className="w-4 h-4 text-dark-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12l5 5L17 6M7 12l5 5L23 6" />
        </svg>
      );
    }

    return (
      <svg className="w-3.5 h-3.5 text-dark-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12l5 5L20 6" />
      </svg>
    );
  };

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-4 py-0.5 animate-slide-up group`}
    >
      {/* Avatar for received messages */}
      {!isMine && (
        <div className="mr-2 mt-auto mb-1">
          {showAvatar ? (
            <Avatar
              name={message.sender.username}
              src={message.sender.avatarUrl}
              size="sm"
            />
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name for group chats */}
        {!isMine && showAvatar && (
          <span className="text-[10px] text-dark-500 ml-1 mb-0.5 font-medium">
            {message.sender.username}
          </span>
        )}

        {/* Reply context */}
        {message.replyTo && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-lg text-xs max-w-[250px] truncate ${
              isMine
                ? 'bg-primary-400/20 text-primary-300 border-l-2 border-primary-400'
                : 'bg-dark-700/40 text-dark-400 border-l-2 border-dark-500'
            }`}
          >
            <span className="font-medium">
              {message.replyTo.sender.username}
            </span>
            : {message.replyTo.content}
          </div>
        )}

        {/* Message bubble */}
        <div className={isMine ? 'message-bubble-sent' : 'message-bubble-received'}>
          {/* Image */}
          {message.type === 'image' && message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="Shared image"
              className="rounded-xl max-w-[300px] mb-1.5"
              loading="lazy"
            />
          )}

          {/* File */}
          {message.type === 'file' && message.mediaUrl && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mb-1.5 text-sm underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attachment
            </a>
          )}

          {/* Text content */}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Timestamp + status */}
          <div
            className={`flex items-center gap-1 mt-1 ${
              isMine ? 'justify-end' : 'justify-start'
            }`}
          >
            <span
              className={`text-[10px] ${
                isMine ? 'text-white/60' : 'text-dark-500'
              }`}
            >
              {format(new Date(message.createdAt), 'HH:mm')}
              {message.editedAt && ' · edited'}
            </span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
