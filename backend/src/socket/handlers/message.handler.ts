import { Socket, Server } from 'socket.io';
import { messageService } from '../../services/message.service';

export const messageHandler = (io: Server, socket: Socket) => {
  const userId = (socket as any).userId;

  // Send a message
  socket.on('chat:message', async (data: {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    mediaUrl?: string;
    replyToId?: string;
  }) => {
    try {
      const message = await messageService.sendMessage(
        data.conversationId,
        userId,
        data.content,
        data.type || 'text',
        data.mediaUrl,
        data.replyToId
      );

      // Emit to all users in the conversation room
      io.to(`conversation:${data.conversationId}`).emit('chat:message', {
        message,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // Edit a message
  socket.on('chat:edit', async (data: {
    messageId: string;
    content: string;
  }) => {
    try {
      const message = await messageService.editMessage(
        data.messageId,
        userId,
        data.content
      );

      // Get conversation from message to emit to room
      io.to(`conversation:${message.conversationId}`).emit('chat:message_updated', {
        messageId: message.id,
        content: message.content,
        editedAt: message.editedAt,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // Delete a message
  socket.on('chat:delete', async (data: { messageId: string; conversationId: string }) => {
    try {
      await messageService.deleteMessage(data.messageId, userId);

      io.to(`conversation:${data.conversationId}`).emit('chat:message_deleted', {
        messageId: data.messageId,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // Mark messages as read
  socket.on('chat:read', async (data: {
    conversationId: string;
    lastMessageId: string;
  }) => {
    try {
      await messageService.markAsRead(
        data.conversationId,
        userId,
        data.lastMessageId
      );

      // Notify other users in the room about read receipts
      socket.to(`conversation:${data.conversationId}`).emit('chat:read_ack', {
        userId,
        conversationId: data.conversationId,
        lastMessageId: data.lastMessageId,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // Join a conversation room
  socket.on('chat:join', (data: { conversationId: string }) => {
    socket.join(`conversation:${data.conversationId}`);
  });

  // Leave a conversation room
  socket.on('chat:leave', (data: { conversationId: string }) => {
    socket.leave(`conversation:${data.conversationId}`);
  });
};
