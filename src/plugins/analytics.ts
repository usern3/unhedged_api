/**
 * Analytics Plugin - Fastify decorator for AnalyticsService
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AnalyticsService } from '../services/analytics.service';

declare module 'fastify' {
  interface FastifyInstance {
    analyticsService: AnalyticsService;
  }
}

const analyticsPlugin: FastifyPluginAsync = async (fastify) => {
  const analyticsService = new AnalyticsService(
    fastify.prisma,
    fastify.log
  );

  fastify.decorate('analyticsService', analyticsService);

  fastify.log.info('Analytics service registered');
};

export default fp(analyticsPlugin, {
  name: 'analytics',
  dependencies: ['prisma']
});
