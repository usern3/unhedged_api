/**
 * Markets Routes
 *
 * Public endpoints for market discovery
 * No authentication required
 */

import { FastifyPluginAsync } from 'fastify';

interface MarketsQuerystring {
  status?: string;
  category?: string;
  tokenStandard?: 'splice-cc' | 'cip-56';
}

interface MarketParams {
  id: string;
}

const marketsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/markets
   * List all active markets
   * PUBLIC - No authentication required
   */
  fastify.get<{ Querystring: MarketsQuerystring }>(
    '/markets',
    {
      schema: {
        tags: ['markets'],
        summary: 'List all markets',
        description: 'Retrieve all active prediction markets with optional filtering by status, category, and token standard',
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by market status'
            },
            category: {
              type: 'string',
              description: 'Filter by market category'
            },
            tokenStandard: {
              type: 'string',
              enum: ['splice-cc', 'cip-56'],
              description: 'Filter by token standard'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              markets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    contractId: { type: 'string' },
                    question: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    status: { type: 'string' },
                    tokenStandard: { type: 'string' },
                    resolutionTime: { type: 'string', format: 'date-time', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              count: { type: 'number' },
              cached: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const { status, category, tokenStandard } = request.query;

      const cacheKey = `markets:${status || 'active'}:${category || 'all'}:${
        tokenStandard || 'all'
      }`;

      // Try cache first (30 second TTL)
      const cached = await fastify.cache.get(cacheKey);
      if (cached) {
        fastify.log.debug({ cacheKey }, '[Markets] Cache hit');
        return reply.send({
          markets: cached,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Query database
      const markets = await fastify.marketService.getMarkets({
        status: status || 'active',
        ...(category && { category }),
        ...(tokenStandard && { tokenStandard })
      });

      // Cache for 30 seconds
      await fastify.cache.set(cacheKey, markets, 30);

      return reply.send({
        markets,
        count: markets.length,
        timestamp: new Date().toISOString()
      });
    }
  );

  /**
   * GET /api/markets/:id
   * Get market details by ID
   * PUBLIC - No authentication required
   */
  fastify.get<{ Params: MarketParams }>(
    '/markets/:id',
    {
      schema: {
        tags: ['markets'],
        summary: 'Get market by ID',
        description: 'Retrieve detailed information about a specific prediction market',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Market contract ID'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              market: {
                type: 'object',
                properties: {
                  contractId: { type: 'string' },
                  question: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  status: { type: 'string' },
                  tokenStandard: { type: 'string' },
                  resolutionTime: { type: 'string', format: 'date-time', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              },
              cached: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              marketId: { type: 'string' }
            }
          }
        }
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;

      const cacheKey = `market:${id}`;

      // Try cache first (30 second TTL)
      const cached = await fastify.cache.get(cacheKey);
      if (cached) {
        fastify.log.debug({ cacheKey }, '[Markets] Cache hit');
        return reply.send({
          market: cached,
          cached: true
        });
      }

      // Query database
      const market = await fastify.marketService.getMarketById(id);

      if (!market) {
        return reply.code(404).send({
          error: 'Market not found',
          marketId: id
        });
      }

      // Cache for 30 seconds
      await fastify.cache.set(cacheKey, market, 30);

      return reply.send({
        market,
        timestamp: new Date().toISOString()
      });
    }
  );

  /**
   * GET /api/markets/:id/stats
   * Get market betting statistics
   * PUBLIC - No authentication required
   */
  fastify.get<{ Params: MarketParams }>(
    '/markets/:id/stats',
    {
      schema: {
        tags: ['markets'],
        summary: 'Get market statistics',
        description: 'Retrieve betting statistics and metrics for a specific market',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Market contract ID'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              stats: {
                type: 'object',
                description: 'Market statistics including volume, bets, and liquidity'
              },
              cached: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;

      const cacheKey = `market:${id}:stats`;

      // Try cache first (60 second TTL for stats)
      const cached = await fastify.cache.get(cacheKey);
      if (cached) {
        fastify.log.debug({ cacheKey }, '[Markets] Cache hit');
        return reply.send({
          stats: cached,
          cached: true
        });
      }

      // Query database
      const stats = await fastify.marketService.getMarketStats(id);

      // Cache for 60 seconds
      await fastify.cache.set(cacheKey, stats, 60);

      return reply.send({
        stats,
        timestamp: new Date().toISOString()
      });
    }
  );

  /**
   * GET /api/markets/monitoring
   * Get market monitoring data (for admin dashboard)
   * PUBLIC - No authentication required
   */
  fastify.get(
    '/markets/monitoring',
    {
      schema: {
        tags: ['markets'],
        summary: 'Get market monitoring data',
        description: 'Retrieve monitoring metrics for admin dashboard (market health, activity, errors)',
        response: {
          200: {
            type: 'object',
            properties: {
              monitoring: {
                type: 'object',
                description: 'Market monitoring data and health metrics'
              },
              cached: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      config: {
        rateLimit: {
          max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
          timeWindow: '1 minute'
        }
      }
    },
    async (_request, reply) => {
      const cacheKey = 'markets:monitoring';

      // Try cache first (60 second TTL)
      const cached = await fastify.cache.get(cacheKey);
      if (cached) {
        fastify.log.debug({ cacheKey }, '[Markets] Cache hit');
        return reply.send({
          monitoring: cached,
          cached: true
        });
      }

      // Query database
      const monitoring = await fastify.marketService.getMarketMonitoring();

      // Cache for 60 seconds
      await fastify.cache.set(cacheKey, monitoring, 60);

      return reply.send({
        monitoring,
        timestamp: new Date().toISOString()
      });
    }
  );
};

export default marketsRoutes;
