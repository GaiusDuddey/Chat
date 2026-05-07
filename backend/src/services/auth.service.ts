import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { createError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  async register(username: string, email: string, password: string) {
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existing) {
      throw createError('Username or email already taken', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { username, email, passwordHash },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      username: user.username,
    });

    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw createError('Invalid credentials', 401);
    }

    // Update last seen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() },
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw createError('Invalid or expired refresh token', 401);
    }

    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      // Delete the invalid token
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      throw createError('Invalid refresh token', 401);
    }

    // Rotate: delete old, create new
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const tokens = await this.generateTokens({
      userId: payload.userId,
      username: payload.username,
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken
      .delete({ where: { token: refreshToken } })
      .catch(() => {});
  }

  private async generateTokens(payload: TokenPayload) {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: payload.userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
