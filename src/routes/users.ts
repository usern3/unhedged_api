import { FastifyPluginAsync } from 'fastify';

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // Create or get user
  fastify.post<{ Body: { username: string; walletAddress?: string; avatar?: string } }>(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Create or get user',
        description: 'Create a new user or return existing user by username'
      }
    },
    async (request, reply) => {
      const { username, walletAddress, avatar } = request.body;

      const { user, created } = await fastify.userService.createOrGetUser({
        username,
        walletAddress,
        avatar,
      });

      return reply.code(created ? 201 : 200).send(user);
    }
  );

  // Get user by username
  fastify.get<{ Params: { username: string } }>(
    '/users/:username',
    {
      schema: {
        tags: ['users'],
        summary: 'Get user by username',
        description: 'Retrieve user profile with message and reaction counts'
      }
    },
    async (request, reply) => {
      const { username } = request.params;

      const user = await fastify.userService.getUserByUsername(username);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return user;
    }
  );

  // Update user
  fastify.patch<{ Params: { id: string }; Body: { avatar?: string; walletAddress?: string } }>(
    '/users/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Update user profile',
        description: 'Update user avatar or wallet address'
      }
    },
    async (request) => {
      const { id } = request.params;
      const { avatar, walletAddress } = request.body;

      const user = await fastify.userService.updateUser(id, {
        avatar,
        walletAddress,
      });

      return user;
    }
  );
};

export default usersRoutes;
