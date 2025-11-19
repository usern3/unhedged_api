import { FastifyPluginAsync } from 'fastify';
import fastifyPrisma from '@joggr/fastify-prisma';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  await fastify.register(fastifyPrisma, {
    client: prisma,
  });

  // Graceful shutdown
  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, {
  name: 'prisma'
});
