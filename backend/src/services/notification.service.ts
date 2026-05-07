import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';

// Notification queue (uses Redis connection)
const notificationQueue = new Queue('notifications', {
  connection: {
    host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
    port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
  },
});

export class NotificationService {
  async sendPushNotification(userId: string, data: {
    title: string;
    body: string;
    conversationId: string;
  }): Promise<void> {
    // Store notification in Redis for badge count
    const key = `notifications:${userId}`;
    await redis.incr(key);

    // In production, this would send to FCM/APNs/Web Push
    console.log(`📱 Push notification for ${userId}:`, data);
  }

  async queueEmailNotification(
    userId: string,
    email: string,
    data: {
      senderName: string;
      messagePreview: string;
      conversationId: string;
    }
  ): Promise<void> {
    await notificationQueue.add('send-email', {
      userId,
      email,
      ...data,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const count = await redis.get(`notifications:${userId}`);
    return count ? parseInt(count, 10) : 0;
  }

  async clearNotifications(userId: string): Promise<void> {
    await redis.del(`notifications:${userId}`);
  }
}

export const notificationService = new NotificationService();
