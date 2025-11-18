import { FastifyPluginAsync } from 'fastify';

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // Create or get user
  fastify.post<{ Body: { username: string; walletAddress?: string; avatar?: string } }>(
    '/users',
    async (request, reply) => {
      const { username, walletAddress, avatar } = request.body;

      // Check if user exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return existingUser;
      }

      // Create new user
      const user = await fastify.prisma.user.create({
        data: {
          username,
          walletAddress: walletAddress ?? null,
          avatar: avatar ?? null,
        },
      });

      return reply.code(201).send(user);
    }
  );

  // Get user by username
  fastify.get<{ Params: { username: string } }>('/users/:username', async (request, reply) => {
    const { username } = request.params;

    const user = await fastify.prisma.user.findUnique({
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
      return reply.code(404).send({ error: 'User not found' });
    }

    return user;
  });

  // Update user
  fastify.patch<{ Params: { id: string }; Body: { avatar?: string; walletAddress?: string } }>(
    '/users/:id',
    async (request) => {
      const { id } = request.params;
      const { avatar, walletAddress } = request.body;

      const user = await fastify.prisma.user.update({
        where: { id },
        data: {
          ...(avatar !== undefined && { avatar: avatar ?? null }),
          ...(walletAddress !== undefined && { walletAddress: walletAddress ?? null }),
        },
      });

      return user;
    }
  );
};

export default usersRoutes;
