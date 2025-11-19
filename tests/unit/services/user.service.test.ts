import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '@/services/user.service';
import { prismaMock, createMockLogger } from '../../helpers/prisma-mock';
import { createMockUser } from '../../helpers/test-data';

describe('UserService', () => {
  let userService: UserService;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    userService = new UserService(prismaMock as any, mockLogger);
  });

  describe('createOrGetUser', () => {
    it('should return existing user when username exists', async () => {
      const existingUser = createMockUser({ username: 'testuser' });

      prismaMock.user.findUnique.mockResolvedValue(existingUser as any);

      const result = await userService.createOrGetUser({
        username: 'testuser',
        walletAddress: '0x123',
        avatar: 'avatar.png'
      });

      expect(result.user).toEqual(existingUser);
      expect(result.created).toBe(false);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[UserService] User already exists',
        { username: 'testuser' }
      );
    });

    it('should create new user when username does not exist', async () => {
      const newUser = createMockUser({ username: 'newuser' });

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(newUser as any);

      const result = await userService.createOrGetUser({
        username: 'newuser',
        walletAddress: '0x456',
        avatar: 'new.png'
      });

      expect(result.user).toEqual(newUser);
      expect(result.created).toBe(true);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: 'newuser',
          walletAddress: '0x456',
          avatar: 'new.png'
        }
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[UserService] User created',
        { username: 'newuser' }
      );
    });

    it('should handle null optional fields correctly', async () => {
      const newUser = createMockUser({
        username: 'testuser',
        walletAddress: null,
        avatar: null
      });

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(newUser as any);

      const result = await userService.createOrGetUser({
        username: 'testuser'
      });

      expect(result.user.walletAddress).toBeNull();
      expect(result.user.avatar).toBeNull();
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          walletAddress: null,
          avatar: null
        }
      });
    });

    it('should handle errors gracefully', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        userService.createOrGetUser({ username: 'test' })
      ).rejects.toThrow('Failed to create or get user');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[UserService] Error creating or getting user',
        expect.objectContaining({
          username: 'test',
          error: 'Database connection failed'
        })
      );
    });
  });

  describe('getUserByUsername', () => {
    it('should return user with counts when user exists', async () => {
      const user = createMockUser({ username: 'testuser' });
      const userWithCounts = {
        ...user,
        _count: { messages: 5, reactions: 10 }
      };

      prismaMock.user.findUnique.mockResolvedValue(userWithCounts as any);

      const result = await userService.getUserByUsername('testuser');

      expect(result).toEqual(userWithCounts);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: {
          _count: {
            select: { messages: true, reactions: true }
          }
        }
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[UserService] Fetching user by username',
        { username: 'testuser' }
      );
    });

    it('should return null when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserByUsername('nonexistent');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[UserService] User not found',
        { username: 'nonexistent' }
      );
    });

    it('should handle database errors', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('Query timeout'));

      await expect(
        userService.getUserByUsername('testuser')
      ).rejects.toThrow('Failed to fetch user: testuser');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user avatar successfully', async () => {
      const userId = 'user-123';
      const updatedUser = createMockUser({
        id: userId,
        avatar: 'new-avatar.png'
      });

      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUser(userId, {
        avatar: 'new-avatar.png'
      });

      expect(result).toEqual(updatedUser);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatar: 'new-avatar.png' }
      });
    });

    it('should update user wallet address successfully', async () => {
      const userId = 'user-123';
      const updatedUser = createMockUser({
        id: userId,
        walletAddress: '0xnewaddress'
      });

      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUser(userId, {
        walletAddress: '0xnewaddress'
      });

      expect(result).toEqual(updatedUser);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { walletAddress: '0xnewaddress' }
      });
    });

    it('should update both avatar and wallet address', async () => {
      const userId = 'user-123';
      const updatedUser = createMockUser({
        id: userId,
        avatar: 'new-avatar.png',
        walletAddress: '0xnewaddress'
      });

      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUser(userId, {
        avatar: 'new-avatar.png',
        walletAddress: '0xnewaddress'
      });

      expect(result).toEqual(updatedUser);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          avatar: 'new-avatar.png',
          walletAddress: '0xnewaddress'
        }
      });
    });

    it('should handle null values for optional fields', async () => {
      const userId = 'user-123';
      const updatedUser = createMockUser({
        id: userId,
        avatar: null
      });

      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUser(userId, {
        avatar: null
      });

      expect(result.avatar).toBeNull();
    });

    it('should handle update errors', async () => {
      const userId = 'user-123';
      prismaMock.user.update.mockRejectedValue(new Error('User not found'));

      await expect(
        userService.updateUser(userId, { avatar: 'new.png' })
      ).rejects.toThrow('Failed to update user: user-123');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
