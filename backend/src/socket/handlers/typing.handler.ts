import { Socket, Server } from 'socket.io';

export const typingHandler = (io: Server, socket: Socket) => {
  const userId = (socket as any).userId;

  socket.on('chat:typing_start', (data: { conversationId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
      userId,
      conversationId: data.conversationId,
      isTyping: true,
    });
  });

  socket.on('chat:typing_stop', (data: { conversationId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
      userId,
      conversationId: data.conversationId,
      isTyping: false,
    });
  });
};
