import { redis } from '../config/redis';
import prisma from '../config/db';

const PRESENCE_TTL = 35; // seconds
const PRESENCE_PREFIX = 'presence:';

export class PresenceService {
  async setOnline(userId: string): Promise<void> {
    await redis.set(`${PRESENCE_PREFIX}${userId}`, 'online', 'EX', PRESENCE_TTL);
  }

  async setOffline(userId: string): Promise<void> {
    await redis.del(`${PRESENCE_PREFIX}${userId}`);

    // Update last_seen in database
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    });
  }

  async isOnline(userId: string): Promise<boolean> {
    const status = await redis.get(`${PRESENCE_PREFIX}${userId}`);
    return status === 'online';
  }

  async getOnlineUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    const pipeline = redis.pipeline();
    userIds.forEach((id) => pipeline.get(`${PRESENCE_PREFIX}${id}`));

    const results = await pipeline.exec();
    if (!results) return [];

    return userIds.filter((_, index) => {
      const result = results[index];
      return result && result[1] === 'online';
    });
  }

  async heartbeat(userId: string): Promise<void> {
    await this.setOnline(userId);
  }
}

export const presenceService = new PresenceService();
