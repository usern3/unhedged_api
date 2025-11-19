import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import usersRoutes from '@/routes/users';
import { createMockUser } from '../../helpers/test-data';

describe('Users Routes Integration', () => {
  let app: FastifyInstance;
  let mockUserService: any;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Create mock user service
    mockUserService = {
      createOrGetUser: vi.fn(),
      getUserByUsername: vi.fn(),
      updateUser: vi.fn()
    };

    // Decorate Fastify instance with mock service
    app.decorate('userService', mockUserService);

    // Register routes
    await app.register(usersRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create new user and return 201', async () => {
      const newUser = createMockUser({ username: 'newuser' });
      mockUserService.createOrGetUser.mockResolvedValue({
        user: newUser,
        created: true
      });

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {
          username: 'newuser',
          walletAddress: '0x123',
          avatar: 'avatar.png'
        }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual(newUser);
      expect(mockUserService.createOrGetUser).toHaveBeenCalledWith({
        username: 'newuser',
        walletAddress: '0x123',
        avatar: 'avatar.png'
      });
    });

    it('should return existing user with 200', async () => {
      const existingUser = createMockUser({ username: 'existing' });
      mockUserService.createOrGetUser.mockResolvedValue({
        user: existingUser,
        created: false
      });

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { username: 'existing' }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(existingUser);
    });

    it('should handle service errors', async () => {
      mockUserService.createOrGetUser.mockRejectedValue(new Error('Service error'));

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { username: 'testuser' }
      });

      expect(response.statusCode).toBe(500);
    });

    it('should accept minimal payload with only username', async () => {
      const user = createMockUser({
        username: 'minimaluser',
        walletAddress: null,
        avatar: null
      });
      mockUserService.createOrGetUser.mockResolvedValue({
        user,
        created: true
      });

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { username: 'minimaluser' }
      });

      expect(response.statusCode).toBe(201);
      expect(mockUserService.createOrGetUser).toHaveBeenCalledWith({
        username: 'minimaluser',
        walletAddress: undefined,
        avatar: undefined
      });
    });
  });

  describe('GET /users/:username', () => {
    it('should return user profile with counts', async () => {
      const user = {
        ...createMockUser({ username: 'testuser' }),
        _count: { messages: 10, reactions: 5 }
      };
      mockUserService.getUserByUsername.mockResolvedValue(user);

      const response = await app.inject({
        method: 'GET',
        url: '/users/testuser'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(user);
      expect(mockUserService.getUserByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should return 404 when user not found', async () => {
      mockUserService.getUserByUsername.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/users/nonexistent'
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({ error: 'User not found' });
    });

    it('should handle service errors', async () => {
      mockUserService.getUserByUsername.mockRejectedValue(new Error('DB error'));

      const response = await app.inject({
        method: 'GET',
        url: '/users/testuser'
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle usernames with special characters', async () => {
      const user = createMockUser({ username: 'user.name-123' });
      mockUserService.getUserByUsername.mockResolvedValue(user);

      const response = await app.inject({
        method: 'GET',
        url: '/users/user.name-123'
      });

      expect(response.statusCode).toBe(200);
      expect(mockUserService.getUserByUsername).toHaveBeenCalledWith('user.name-123');
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user avatar successfully', async () => {
      const userId = 'user-123';
      const updatedUser = createMockUser({
        id: userId,
        avatar: 'new-avatar.png'
      });
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${userId}`,
        payload: { avatar: 'new-avatar.png' }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(updatedUser);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, {
        avatar: 'new-avatar.png',
        walletAddress: undefined
      });
    });

    it('should update user wallet address successfully', async () => {
      const userId = 'user-456';
      const updatedUser = createMockUser({
        id: userId,
        walletAddress: '0xnewaddress'
      });
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${userId}`,
        payload: { walletAddress: '0xnewaddress' }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(updatedUser);
    });

    it('should update both fields simultaneously', async () => {
      const userId = 'user-789';
      const updatedUser = createMockUser({
        id: userId,
        avatar: 'avatar.png',
        walletAddress: '0x123'
      });
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${userId}`,
        payload: {
          avatar: 'avatar.png',
          walletAddress: '0x123'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, {
        avatar: 'avatar.png',
        walletAddress: '0x123'
      });
    });

    it('should handle service errors', async () => {
      mockUserService.updateUser.mockRejectedValue(new Error('Update failed'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/user-123',
        payload: { avatar: 'new.png' }
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle UUID format for user ID', async () => {
      const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const updatedUser = createMockUser({ id: userId });
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${userId}`,
        payload: { avatar: 'test.png' }
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
