import { FastifyPluginAsync } from 'fastify';

const reactionsRoutes: FastifyPluginAsync = async (fastify) => {
  // Add reaction to message
  fastify.post<{ Body: { emoji: string; messageId: string; userId: string } }>(
    '/reactions',
    async (request, reply) => {
      const { emoji, messageId, userId } = request.body;

      // Validate emoji (basic validation)
      if (!emoji || emoji.length > 10) {
        return reply.code(400).send({ error: 'Invalid emoji' });
      }

      // Check if reaction already exists
      const existingReaction = await fastify.prisma.reaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji,
          },
        },
      });

      if (existingReaction) {
        return reply.code(409).send({ error: 'Reaction already exists' });
      }

      const reaction = await fastify.prisma.reaction.create({
        data: {
          emoji,
          messageId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return reply.code(201).send(reaction);
    }
  );

  // Remove reaction
  fastify.delete<{ Params: { id: string }; Body: { userId: string } }>(
    '/reactions/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { userId } = request.body;

      const reaction = await fastify.prisma.reaction.findUnique({
        where: { id },
      });

      if (!reaction) {
        return reply.code(404).send({ error: 'Reaction not found' });
      }

      if (reaction.userId !== userId) {
        return reply.code(403).send({ error: 'Not authorized to remove this reaction' });
      }

      await fastify.prisma.reaction.delete({
        where: { id },
      });

      return reply.code(204).send();
    }
  );

  // Get reactions for a message
  fastify.get<{ Params: { messageId: string } }>(
    '/messages/:messageId/reactions',
    async (request) => {
      const { messageId } = request.params;

      const reactions = await fastify.prisma.reaction.findMany({
        where: { messageId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Group by emoji
      type GroupedReactions = Record<string, { emoji: string; count: number; users: Array<{ id: string; username: string }> }>;

      const grouped = reactions.reduce((acc: GroupedReactions, reaction: typeof reactions[0]) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: [],
          };
        }
        const group = acc[reaction.emoji];
        if (group) {
          group.count++;
          group.users.push({
            id: reaction.user.id,
            username: reaction.user.username,
          });
        }
        return acc;
      }, {} as GroupedReactions);

      return Object.values(grouped);
    }
  );
};

export default reactionsRoutes;
