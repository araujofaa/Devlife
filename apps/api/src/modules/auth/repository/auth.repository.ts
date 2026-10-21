import { prisma } from '../../../shared/database/prisma';
import { User } from '@prisma/client';

export const authRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async createUser(data: { email: string; name: string; password_hash: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
      },
    });
  },

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  async deleteRefreshToken(token: string) {
    return prisma.refreshToken.delete({ where: { token } });
  },

  async deleteAllRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  },
async findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
  },
};