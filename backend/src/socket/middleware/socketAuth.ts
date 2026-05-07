import { Socket } from 'socket.io';
import { verifyAccessToken } from '../../utils/jwt';

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const payload = verifyAccessToken(token);
    (socket as any).userId = payload.userId;
    (socket as any).username = payload.username;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};
