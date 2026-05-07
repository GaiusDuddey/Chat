import React from 'react';
import { Conversation } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { usePresence } from '../../hooks/usePresence';
import Avatar from '../UI/Avatar';
import Badge from '../UI/Badge';
import { formatDistanceToNow } from 'date-fns';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { user } = useAuthStore();
  const { isOnline } = usePresence();

  // For direct chats, show the other person's info
  const otherMember = conversation.type === 'direct'
    ? conversation.members.find((m) => m.userId !== user?.id)
    : null;

  const displayName =
    conversation.type === 'group'
      ? conversation.name || 'Group Chat'
      : otherMember?.user.username || 'Unknown';

  const avatarUrl =
    conversation.type === 'group'
      ? conversation.avatarUrl
      : otherMember?.user.avatarUrl;

  const isOtherOnline = otherMember
    ? isOnline(otherMember.userId)
    : false;

  const lastMessage = conversation.messages[0];
  const lastMessageText = lastMessage
    ? lastMessage.content || (lastMessage.type === 'image' ? '📷 Image' : '📎 File')
    : 'No messages yet';

  const lastMessageTime = lastMessage
    ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })
    : '';

  return (
    <button
      id={`conversation-${conversation.id}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left group ${
        isActive
          ? 'bg-primary-500/10 border border-primary-500/20'
          : 'hover:bg-dark-800/50 border border-transparent'
      }`}
    >
      <Avatar
        name={displayName}
        src={avatarUrl}
        size="lg"
        isOnline={conversation.type === 'direct' ? isOtherOnline : undefined}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-primary-400' : 'text-dark-100'
            }`}
          >
            {displayName}
          </h3>
          {lastMessageTime && (
            <span className="text-[10px] text-dark-500 shrink-0 ml-2">
              {lastMessageTime}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-dark-400 truncate pr-2">
            {lastMessage && conversation.type === 'group' && (
              <span className="text-dark-500">
                {lastMessage.sender.username}:{' '}
              </span>
            )}
            {lastMessageText}
          </p>
          <Badge count={conversation.unreadCount} />
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;
