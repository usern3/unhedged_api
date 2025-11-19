/**
 * Analytics Routes - Comprehensive Analytics API
 *
 * PUBLIC ENDPOINTS:
 * - GET /api/analytics/summary - Public platform stats
 * - GET /api/analytics/leaderboard/:type - Leaderboards (5 types)
 *
 * USER ENDPOINTS (Authenticated - TODO):
 * - GET /api/analytics/user/:userId - User engagement metrics
 *
 * ADMIN ENDPOINTS (Admin Only - TODO):
 * - GET /api/admin/analytics - Enhanced platform statistics
 * - GET /api/admin/analytics/daily - Daily metrics
 * - GET /api/admin/analytics/market/:marketId - Per-market analytics
 * - GET /api/admin/analytics/health - Platform health assessment
 * - GET /api/admin/analytics/leaderboards/all - All leaderboards at once
 */

import { FastifyPluginAsync } from 'fastify';

// Query/Params types
interface LeaderboardParams {
  type: string;
}

interface LeaderboardQuerystring {
  limit?: string;
}

interface UserParams {
  userId: string;
}

interface MarketParams {
  marketId: string;
}

interface DaysQuerystring {
  days?: string;
}

interface AllLeaderboardsQuerystring {
  limit?: string;
}

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  /**
   * GET /api/analytics/summary
   * Get public platform statistics
   */
  fastify.get(
    '/analytics/summary',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get platform statistics',
        description: 'Public platform statistics and metrics'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (_request, reply) => {
      const cacheKey = 'analytics:summary';
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info('[Analytics] GET /analytics/summary');

      try {
        const stats = await fastify.analyticsService.getPublicStats();
        await fastify.cache.set(cacheKey, stats, 60); // Cache for 60s

        return reply.send(stats);
      } catch (error) {
        fastify.log.error({ error: error instanceof Error ? error.message : 'Unknown' }, '[Analytics] Error fetching public stats');
        return reply.status(500).send({
          error: 'Failed to fetch platform statistics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/analytics/leaderboard/:type
   * Get leaderboard by type
   * Types: profit, winrate, volume, roi, activity
   */
  fastify.get<{ Params: LeaderboardParams; Querystring: LeaderboardQuerystring }>(
    '/analytics/leaderboard/:type',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get leaderboard',
        description: 'Retrieve leaderboard by type: profit, winrate, volume, roi, activity'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (request, reply) => {
      const { type } = request.params;
      const limit = parseInt(request.query.limit || '10');

      const cacheKey = `analytics:leaderboard:${type}:${limit}`;
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info({ type, limit }, '[Analytics] GET /analytics/leaderboard/:type');

      try {
        let leaderboard;

        switch (type.toLowerCase()) {
          case 'profit':
            leaderboard = await fastify.analyticsService.getProfitLeaderboard(limit);
            break;
          case 'winrate':
          case 'win-rate':
            leaderboard = await fastify.analyticsService.getWinRateLeaderboard(limit);
            break;
          case 'volume':
            leaderboard = await fastify.analyticsService.getVolumeLeaderboard(limit);
            break;
          case 'roi':
            leaderboard = await fastify.analyticsService.getROILeaderboard(limit);
            break;
          case 'activity':
            leaderboard = await fastify.analyticsService.getActivityLeaderboard(limit);
            break;
          default:
            return reply.status(400).send({
              error: 'Invalid leaderboard type',
              message: 'Valid types: profit, winrate, volume, roi, activity'
            });
        }

        const response = {
          type,
          limit,
          entries: leaderboard
        };

        await fastify.cache.set(cacheKey, response, 120); // Cache for 2 minutes

        return reply.send(response);
      } catch (error) {
        fastify.log.error({
          type,
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error fetching leaderboard');

        return reply.status(500).send({
          error: 'Failed to fetch leaderboard',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ============================================================================
  // USER ENDPOINTS (TODO: Add authentication middleware)
  // ============================================================================

  /**
   * GET /api/analytics/user/:userId
   * Get user engagement analytics
   * TODO: Add authentication middleware
   */
  fastify.get<{ Params: UserParams }>(
    '/analytics/user/:userId',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get user analytics',
        description: 'User engagement and betting analytics'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (request, reply) => {
      const { userId } = request.params;

      const cacheKey = `analytics:user:${userId}`;
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info({ userId }, '[Analytics] GET /analytics/user/:userId');

      try {
        // TODO: Verify user can only access their own data (unless admin)
        // const requestorParty = request.user!.partyId;
        // if (!isAdmin && requestorParty !== userId) {
        //   return reply.status(403).send({
        //     error: 'Forbidden',
        //     message: 'You can only access your own analytics'
        //   });
        // }

        const engagement = await fastify.analyticsService.getUserEngagement(userId);
        await fastify.cache.set(cacheKey, engagement, 300); // Cache for 5 minutes

        return reply.send(engagement);
      } catch (error) {
        fastify.log.error({
          userId,
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error fetching user engagement');

        if (error instanceof Error && error.message.includes('No betting activity')) {
          return reply.status(404).send({
            error: 'No data found',
            message: error.message
          });
        }

        return reply.status(500).send({
          error: 'Failed to fetch user engagement analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ============================================================================
  // ADMIN ENDPOINTS (TODO: Add authentication + admin middleware)
  // ============================================================================

  /**
   * GET /api/admin/analytics
   * Get enhanced platform statistics
   * TODO: Add admin middleware
   */
  fastify.get<{ Querystring: DaysQuerystring }>(
    '/admin/analytics',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get enhanced platform stats (Admin)',
        description: 'Enhanced platform statistics for administrators'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (request, reply) => {
      const days = parseInt(request.query.days || '30');

      const cacheKey = `analytics:enhanced:${days}`;
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info({ days }, '[Analytics] GET /admin/analytics');

      try {
        const enhancedStats = await fastify.analyticsService.getEnhancedPlatformStats(days);
        await fastify.cache.set(cacheKey, enhancedStats, 300); // Cache for 5 minutes

        return reply.send(enhancedStats);
      } catch (error) {
        fastify.log.error({
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error fetching enhanced analytics');

        return reply.status(500).send({
          error: 'Failed to fetch enhanced analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/admin/analytics/daily
   * Get daily metrics
   * TODO: Add admin middleware
   */
  fastify.get<{ Querystring: DaysQuerystring }>(
    '/admin/analytics/daily',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get daily metrics (Admin)',
        description: 'Daily platform metrics for administrators'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (request, reply) => {
      const days = parseInt(request.query.days || '30');

      const cacheKey = `analytics:daily:${days}`;
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info({ days }, '[Analytics] GET /admin/analytics/daily');

      try {
        const dailyMetrics = await fastify.analyticsService.getDailyMetrics(days);
        const response = {
          period: `${days} days`,
          metrics: dailyMetrics
        };

        await fastify.cache.set(cacheKey, response, 600); // Cache for 10 minutes

        return reply.send(response);
      } catch (error) {
        fastify.log.error({
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error fetching daily metrics');

        return reply.status(500).send({
          error: 'Failed to fetch daily metrics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/admin/analytics/market/:marketId
   * Get per-market analytics
   * TODO: Add admin middleware
   */
  fastify.get<{ Params: MarketParams }>(
    '/admin/analytics/market/:marketId',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get market analytics (Admin)',
        description: 'Per-market analytics and statistics for administrators'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (request, reply) => {
      const { marketId } = request.params;

      const cacheKey = `analytics:market:${marketId}`;
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info({ marketId }, '[Analytics] GET /admin/analytics/market/:marketId');

      try {
        const marketAnalytics = await fastify.analyticsService.getMarketAnalytics(marketId);
        await fastify.cache.set(cacheKey, marketAnalytics, 300); // Cache for 5 minutes

        return reply.send(marketAnalytics);
      } catch (error) {
        fastify.log.error({
          marketId,
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error fetching market analytics');

        if (error instanceof Error && error.message.includes('not found')) {
          return reply.status(404).send({
            error: 'Market not found',
            message: error.message
          });
        }

        return reply.status(500).send({
          error: 'Failed to fetch market analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/admin/analytics/health
   * Get platform health assessment
   * TODO: Add admin middleware
   */
  fastify.get(
    '/admin/analytics/health',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get platform health (Admin)',
        description: 'Platform health assessment for administrators'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (_request, reply) => {
      const cacheKey = 'analytics:health';
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info('[Analytics] GET /admin/analytics/health');

      try {
        const health = await fastify.analyticsService.assessPlatformHealth();
        await fastify.cache.set(cacheKey, health, 300); // Cache for 5 minutes

        return reply.send(health);
      } catch (error) {
        fastify.log.error({
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error assessing platform health');

        return reply.status(500).send({
          error: 'Failed to assess platform health',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/admin/analytics/leaderboards/all
   * Get all leaderboards at once
   * TODO: Add admin middleware
   */
  fastify.get<{ Querystring: AllLeaderboardsQuerystring }>(
    '/admin/analytics/leaderboards/all',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Get all leaderboards (Admin)',
        description: 'All leaderboard types at once for administrators'
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
        }
      }
    },
    async (request, reply) => {
      const limit = parseInt(request.query.limit || '10');

      const cacheKey = `analytics:leaderboards:all:${limit}`;
      const cached = await fastify.cache.get(cacheKey);

      if (cached) {
        fastify.log.debug({ cacheKey }, '[Analytics] Cache hit');
        return reply.send({ ...cached, cached: true });
      }

      fastify.log.info({ limit }, '[Analytics] GET /admin/analytics/leaderboards/all');

      try {
        const [profit, winRate, volume, roi, activity] = await Promise.all([
          fastify.analyticsService.getProfitLeaderboard(limit),
          fastify.analyticsService.getWinRateLeaderboard(limit),
          fastify.analyticsService.getVolumeLeaderboard(limit),
          fastify.analyticsService.getROILeaderboard(limit),
          fastify.analyticsService.getActivityLeaderboard(limit)
        ]);

        const response = {
          limit,
          leaderboards: {
            profit,
            winRate,
            volume,
            roi,
            activity
          }
        };

        await fastify.cache.set(cacheKey, response, 120); // Cache for 2 minutes

        return reply.send(response);
      } catch (error) {
        fastify.log.error({
          error: error instanceof Error ? error.message : 'Unknown'
        }, '[Analytics] Error fetching all leaderboards');

        return reply.status(500).send({
          error: 'Failed to fetch leaderboards',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
};

export default analyticsRoutes;
