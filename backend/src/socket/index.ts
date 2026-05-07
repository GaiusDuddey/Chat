import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient } from '../config/redis';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { messageHandler } from './handlers/message.handler';
import { presenceHandler } from './handlers/presence.handler';
import { typingHandler } from './handlers/typing.handler';

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Set up Redis adapter for horizontal scaling
  // ioredis auto-connects, so we just create clients and attach
  try {
    const pubClient = createRedisClient();
    const subClient = createRedisClient();

    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter configured');
  } catch (err: any) {
    console.warn('⚠️ Redis adapter setup failed, using in-memory adapter:', err.message);
  }

  // Auth middleware
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    const username = (socket as any).username;
    console.log(`🔌 User connected: ${username} (${userId})`);

    // Register handlers
    messageHandler(io, socket);
    presenceHandler(io, socket);
    typingHandler(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${username} — ${reason}`);
    });
  });

  return io;
};
