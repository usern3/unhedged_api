import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { CacheService, CacheConfig } from '../services/cache.service';

declare module 'fastify' {
  interface FastifyInstance {
    cache: CacheService;
  }
}

const cachePlugin: FastifyPluginAsync = async (fastify) => {
  const config: CacheConfig = {
    enabled: process.env.REDIS_ENABLED !== 'false'
  };

  if (process.env.REDIS_HOST) {
    config.host = process.env.REDIS_HOST;
    config.port = parseInt(process.env.REDIS_PORT || '6379');
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
  }

  const cache = new CacheService(config, fastify.log);

  fastify.decorate('cache', cache);

  fastify.addHook('onClose', async () => {
    await cache.close();
  });
};

export default fp(cachePlugin);
