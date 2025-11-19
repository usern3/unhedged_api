import { FastifyPluginAsync } from 'fastify';

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get recent messages (paginated)
  fastify.get<{ Querystring: { limit?: string; before?: string } }>(
    '/messages',
    {
      schema: {
        tags: ['messages'],
        summary: 'Get recent messages',
        description: 'Retrieve paginated trollbox messages with user and reaction data'
      }
    },
    async (request) => {
      const limit = parseInt(request.query.limit || '50', 10);
      const before = request.query.before;

      const messages = await fastify.prisma.message.findMany({
        take: Math.min(limit, 100), // Max 100 messages
        ...(before && {
          where: {
            createdAt: {
              lt: new Date(before),
            },
          },
        }),
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              walletAddress: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      return messages;
    }
  );

  // Get single message
  fastify.get<{ Params: { id: string } }>(
    '/messages/:id',
    {
      schema: {
        tags: ['messages'],
        summary: 'Get message by ID',
        description: 'Retrieve a single message with user and reaction data'
      }
    },
    async (request, reply) => {
    const { id } = request.params;

    const message = await fastify.prisma.message.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            walletAddress: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    return message;
  });

  // Post message
  fastify.post<{ Body: { content: string; userId: string } }>(
    '/messages',
    {
      schema: {
        tags: ['messages'],
        summary: 'Post a new message',
        description: 'Create a new trollbox message (max 1000 characters)'
      }
    },
    async (request, reply) => {
      const { content, userId } = request.body;

      // Validate content length
      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Message content cannot be empty' });
      }

      if (content.length > 1000) {
        return reply.code(400).send({ error: 'Message too long (max 1000 characters)' });
      }

      const message = await fastify.prisma.message.create({
        data: {
          content: content.trim(),
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              walletAddress: true,
            },
          },
          reactions: true,
        },
      });

      return reply.code(201).send(message);
    }
  );

  // Edit message
  fastify.patch<{ Params: { id: string }; Body: { content: string; userId: string } }>(
    '/messages/:id',
    {
      schema: {
        tags: ['messages'],
        summary: 'Edit a message',
        description: 'Update message content (author only)'
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { content, userId } = request.body;

      // Verify message exists and belongs to user
      const existingMessage = await fastify.prisma.message.findUnique({
        where: { id },
      });

      if (!existingMessage) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      if (existingMessage.userId !== userId) {
        return reply.code(403).send({ error: 'Not authorized to edit this message' });
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Message content cannot be empty' });
      }

      if (content.length > 1000) {
        return reply.code(400).send({ error: 'Message too long (max 1000 characters)' });
      }

      const message = await fastify.prisma.message.update({
        where: { id },
        data: {
          content: content.trim(),
          isEdited: true,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              walletAddress: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      return message;
    }
  );

  // Delete message
  fastify.delete<{ Params: { id: string }; Body: { userId: string } }>(
    '/messages/:id',
    {
      schema: {
        tags: ['messages'],
        summary: 'Delete a message',
        description: 'Remove a message (author only)'
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { userId } = request.body;

      // Verify message exists and belongs to user
      const existingMessage = await fastify.prisma.message.findUnique({
        where: { id },
      });

      if (!existingMessage) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      if (existingMessage.userId !== userId) {
        return reply.code(403).send({ error: 'Not authorized to delete this message' });
      }

      await fastify.prisma.message.delete({
        where: { id },
      });

      return reply.code(204).send();
    }
  );
};

export default messagesRoutes;
