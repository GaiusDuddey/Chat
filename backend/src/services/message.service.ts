import prisma from '../config/db';
import { createError } from '../middleware/error.middleware';
import { PaginationParams, PaginatedResult } from '../utils/pagination';

export class MessageService {
  async getMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<any>> {
    // Verify user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw createError('Not a member of this conversation', 403);
    }

    const { cursor, limit } = pagination;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { id: true, username: true },
            },
          },
        },
        statuses: {
          select: { userId: true, status: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, nextCursor, hasMore };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    mediaUrl?: string,
    replyToId?: string
  ) {
    // Verify user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });

    if (!member) {
      throw createError('Not a member of this conversation', 403);
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
        mediaUrl,
        replyToId,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    // Create delivery statuses for all other members
    const members = await prisma.conversationMember.findMany({
      where: {
        conversationId,
        userId: { not: senderId },
      },
    });

    if (members.length > 0) {
      await prisma.messageStatus.createMany({
        data: members.map((m) => ({
          messageId: message.id,
          userId: m.userId,
          status: 'delivered' as const,
        })),
      });
    }

    return message;
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createError('Message not found', 404);
    }

    if (message.senderId !== userId) {
      throw createError('Cannot edit another user\'s message', 403);
    }

    return prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createError('Message not found', 404);
    }

    if (message.senderId !== userId) {
      throw createError('Cannot delete another user\'s message', 403);
    }

    return prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null, mediaUrl: null },
    });
  }

  async markAsRead(conversationId: string, userId: string, lastMessageId: string) {
    // Update all unread messages in conversation as read for this user
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
      },
      select: { id: true },
    });

    const messageIds = messages.map((m) => m.id);

    // Upsert statuses
    for (const msgId of messageIds) {
      await prisma.messageStatus.upsert({
        where: {
          messageId_userId: { messageId: msgId, userId },
        },
        update: { status: 'read', updatedAt: new Date() },
        create: { messageId: msgId, userId, status: 'read' },
      });
    }

    // Update last_read_at for the member
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });
  }
}

export const messageService = new MessageService();
