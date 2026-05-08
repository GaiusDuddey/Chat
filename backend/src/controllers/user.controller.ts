import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { createError } from '../middleware/error.middleware';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bio, avatarUrl, username } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(username !== undefined && { username }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query required' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user!.userId } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
      },
      take: 20,
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        lastSeen: true,
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};
