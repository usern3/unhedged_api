import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { MarketService } from '../services/market.service';

declare module 'fastify' {
  interface FastifyInstance {
    marketService: MarketService;
  }
}

const marketPlugin: FastifyPluginAsync = async (fastify) => {
  const marketService = new MarketService(fastify.prisma, fastify.log);

  fastify.decorate('marketService', marketService);
};

export default fp(marketPlugin, {
  name: 'market',
  dependencies: ['prisma']
});
