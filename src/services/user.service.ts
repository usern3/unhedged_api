/**
 * UserService - Business logic for user management
 *
 * Handles:
 * - User creation and retrieval
 * - User profile updates
 * - Database operations via Prisma
 */

import { PrismaClient } from '@prisma/client';

export interface CreateUserData {
  username: string;
  walletAddress?: string | undefined;
  avatar?: string | undefined;
}

export interface UpdateUserData {
  avatar?: string | undefined;
  walletAddress?: string | undefined;
}

export class UserService {
  constructor(private prisma: PrismaClient, private logger?: any) {}

  /**
   * Create a new user or return existing user by username
   */
  async createOrGetUser(data: CreateUserData) {
    try {
      this.logger?.info('[UserService] Creating or getting user', { username: data.username });

      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUser) {
        this.logger?.info('[UserService] User already exists', { username: data.username });
        return { user: existingUser, created: false };
      }

      // Create new user
      const user = await this.prisma.user.create({
        data: {
          username: data.username,
          walletAddress: data.walletAddress ?? null,
          avatar: data.avatar ?? null,
        },
      });

      this.logger?.info('[UserService] User created', { username: data.username });
      return { user, created: true };
    } catch (error) {
      this.logger?.error('[UserService] Error creating or getting user', {
        username: data.username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to create or get user');
    }
  }

  /**
   * Get user by username with counts
   */
  async getUserByUsername(username: string) {
    try {
      this.logger?.info('[UserService] Fetching user by username', { username });

      const user = await this.prisma.user.findUnique({
        where: { username },
        include: {
          _count: {
            select: {
              messages: true,
              reactions: true,
            },
          },
        },
      });

      if (!user) {
        this.logger?.warn('[UserService] User not found', { username });
        return null;
      }

      return user;
    } catch (error) {
      this.logger?.error('[UserService] Error fetching user', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch user: ${username}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, data: UpdateUserData) {
    try {
      this.logger?.info('[UserService] Updating user', { id, data });

      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.avatar !== undefined && { avatar: data.avatar ?? null }),
          ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress ?? null }),
        },
      });

      this.logger?.info('[UserService] User updated', { id });
      return user;
    } catch (error) {
      this.logger?.error('[UserService] Error updating user', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to update user: ${id}`);
    }
  }
}
