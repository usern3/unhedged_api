import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Comprehensive health check endpoint
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Comprehensive API health check with service status details',
      summary: 'Check API health and service availability',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded'], description: 'Overall system health status' },
            timestamp: { type: 'string', format: 'date-time', description: 'Current server time' },
            uptime: { type: 'number', description: 'Process uptime in seconds' },
            version: { type: 'string', description: 'API version from package.json' },
            environment: { type: 'string', description: 'Current environment (development/production)' },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error'] },
                    responseTime: { type: 'number', description: 'Database query response time in ms' }
                  }
                },
                cache: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error'] },
                    type: { type: 'string', description: 'Cache type (redis/memory)' }
                  }
                },
                websocket: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error'] },
                    registered: { type: 'boolean', description: 'WebSocket plugin registered' }
                  }
                }
              },
              description: 'Individual service health status'
            },
            system: {
              type: 'object',
              properties: {
                nodeVersion: { type: 'string', description: 'Node.js version' },
                platform: { type: 'string', description: 'Operating system platform' },
                memory: {
                  type: 'object',
                  properties: {
                    used: { type: 'number', description: 'Used memory in MB' },
                    total: { type: 'number', description: 'Total memory in MB' },
                    percentage: { type: 'number', description: 'Memory usage percentage' }
                  }
                }
              },
              description: 'System and runtime information'
            }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['error'] },
            timestamp: { type: 'string', format: 'date-time' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    type ServiceStatus = 'ok' | 'error';

    // Check database health
    let databaseStatus: { status: ServiceStatus; responseTime: number } = {
      status: 'error',
      responseTime: 0
    };
    try {
      const dbStartTime = Date.now();
      await fastify.prisma.$queryRaw`SELECT 1`;
      databaseStatus = {
        status: 'ok',
        responseTime: Date.now() - dbStartTime
      };
    } catch (error) {
      fastify.log.error({ error }, 'Database health check failed');
    }

    // Check cache health
    let cacheStatus: { status: ServiceStatus; type: string } = {
      status: 'error',
      type: 'unknown'
    };
    try {
      const cacheType = fastify.cache ? (fastify.cache.constructor.name.includes('Redis') ? 'redis' : 'memory') : 'unknown';
      if (fastify.cache) {
        // Simple cache availability check
        await fastify.cache.get('health-check-key');
        cacheStatus = { status: 'ok', type: cacheType };
      }
    } catch (error) {
      fastify.log.error({ error }, 'Cache health check failed');
      cacheStatus = { status: 'error', type: 'unknown' };
    }

    // Check WebSocket health
    const websocketStatus: { status: ServiceStatus; registered: boolean } = {
      status: fastify.websocketServer ? 'ok' : 'error',
      registered: !!fastify.websocketServer
    };

    // System information
    const memoryUsage = process.memoryUsage();
    const totalMemoryMB = memoryUsage.heapTotal / 1024 / 1024;
    const usedMemoryMB = memoryUsage.heapUsed / 1024 / 1024;

    const system = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(usedMemoryMB * 100) / 100,
        total: Math.round(totalMemoryMB * 100) / 100,
        percentage: Math.round((usedMemoryMB / totalMemoryMB) * 100 * 100) / 100
      }
    };

    // Determine overall status
    const allServicesOk = databaseStatus.status === 'ok' &&
                          cacheStatus.status === 'ok' &&
                          websocketStatus.status === 'ok';

    const overallStatus: 'ok' | 'degraded' = allServicesOk ? 'ok' : 'degraded';

    // Return 503 if critical services are down (database)
    if (databaseStatus.status === 'error') {
      reply.code(503);
      return {
        status: 'error' as const,
        timestamp: new Date().toISOString(),
        error: 'Critical service unavailable: database'
      };
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseStatus,
        cache: cacheStatus,
        websocket: websocketStatus
      },
      system
    };
  });
};

export default healthRoutes;
