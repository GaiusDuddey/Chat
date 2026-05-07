import { Socket, Server } from 'socket.io';
import { presenceService } from '../../services/presence.service';
import prisma from '../../config/db';

export const presenceHandler = (io: Server, socket: Socket) => {
  const userId = (socket as any).userId;

  // Set user online when connected
  const goOnline = async () => {
    await presenceService.setOnline(userId);

    // Get all conversations of this user and notify members
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    memberships.forEach((m) => {
      socket.to(`conversation:${m.conversationId}`).emit('user:online', {
        userId,
      });
    });
  };

  goOnline();

  // Heartbeat — keep presence alive
  socket.on('heartbeat', async () => {
    await presenceService.heartbeat(userId);
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    await presenceService.setOffline(userId);

    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const lastSeen = new Date().toISOString();

    memberships.forEach((m) => {
      io.to(`conversation:${m.conversationId}`).emit('user:offline', {
        userId,
        lastSeen,
      });
    });
  });
};
