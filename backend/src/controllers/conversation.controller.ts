import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { createError } from '../middleware/error.middleware';
import { z } from 'zod';

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  name: z.string().max(100).optional(),
  memberIds: z.array(z.string().uuid()),
});

export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, lastSeen: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sort by latest message
    const sorted = conversations.sort((a, b) => {
      const aTime = a.messages[0]?.createdAt?.getTime() || a.createdAt.getTime();
      const bTime = b.messages[0]?.createdAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    // Add unread count
    const withUnread = await Promise.all(
      sorted.map(async (conv) => {
        const member = conv.members.find((m) => m.userId === userId);
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: {
              gt: member?.lastReadAt || new Date(0),
            },
          },
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    res.json(withUnread);
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const data = createConversationSchema.parse(req.body);

    // For direct conversations, check if one already exists
    if (data.type === 'direct') {
      if (data.memberIds.length !== 1) {
        throw createError('Direct conversations must have exactly one other member', 400);
      }

      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'direct',
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: data.memberIds[0] } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true, lastSeen: true },
              },
            },
          },
        },
      });

      if (existingConversation) {
        res.json(existingConversation);
        return;
      }
    }

    // Create the conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: data.type,
        name: data.name,
        createdBy: userId,
        members: {
          create: [
            { userId, role: data.type === 'group' ? 'admin' : 'member' },
            ...data.memberIds.map((id) => ({
              userId: id,
              role: 'member',
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, lastSeen: true },
            },
          },
        },
      },
    });

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

export const getConversationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, bio: true, lastSeen: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw createError('Conversation not found', 404);
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

export const updateConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name, avatarUrl } = req.body;

    // Check if user is admin
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    });

    if (!member || member.role !== 'admin') {
      throw createError('Only admins can update the conversation', 403);
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { memberId } = req.body;

    // Check if user is admin
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    });

    if (!member || member.role !== 'admin') {
      throw createError('Only admins can add members', 403);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation || conversation.type !== 'group') {
      throw createError('Can only add members to group conversations', 400);
    }

    await prisma.conversationMember.create({
      data: {
        conversationId: id,
        userId: memberId,
        role: 'member',
      },
    });

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, userId: memberToRemove } = req.params;
    const userId = req.user!.userId;

    // Check if user is admin or removing themselves
    if (memberToRemove !== userId) {
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: { conversationId: id, userId },
        },
      });

      if (!member || member.role !== 'admin') {
        throw createError('Only admins can remove members', 403);
      }
    }

    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId: id, userId: memberToRemove },
      },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};
