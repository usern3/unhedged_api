import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { UserService } from '../services/user.service';

declare module 'fastify' {
  interface FastifyInstance {
    userService: UserService;
  }
}

const userPlugin: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService(fastify.prisma, fastify.log);

  fastify.decorate('userService', userService);
};

export default fp(userPlugin, {
  name: 'user',
  dependencies: ['prisma']
});
