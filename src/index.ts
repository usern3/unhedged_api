import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import prismaPlugin from './plugins/prisma';
import websocketPlugin from './plugins/websocket';
import cachePlugin from './plugins/cache';
import userPlugin from './plugins/user';
import marketPlugin from './plugins/market';
import analyticsPlugin from './plugins/analytics';
import usersRoutes from './routes/users';
import messagesRoutes from './routes/messages';
import reactionsRoutes from './routes/reactions';
import marketsRoutes from './routes/markets';
import analyticsRoutes from './routes/analytics';

const fastify = Fastify({
  logger:
    process.env.NODE_ENV === 'development'
      ? {
          level: process.env.LOG_LEVEL || 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          level: process.env.LOG_LEVEL || 'info',
        },
});

// Register plugins
async function start() {
  try {
    // Register Swagger FIRST (before any routes, at root level)
    await fastify.register(fastifySwagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Unhedged API',
          description: 'Prediction markets platform API with real-time messaging, market analytics, and DAML integration',
          version: '1.0.0',
        },
        tags: [
          { name: 'analytics', description: 'Platform and user analytics' },
          { name: 'health', description: 'Health check endpoints' },
          { name: 'markets', description: 'Prediction market discovery' },
          { name: 'messages', description: 'Trollbox messaging endpoints' },
          { name: 'reactions', description: 'Message reaction endpoints' },
          { name: 'users', description: 'User management endpoints' },
        ],
      },
    });

    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        displayRequestDuration: true,
        filter: true,
      },
    });

    // Register rate limit plugin
    await fastify.register(rateLimit, {
      global: false // Apply per-route via config
    });

    // Register Prisma plugin
    await fastify.register(prismaPlugin);

    // Register cache plugin
    await fastify.register(cachePlugin);

    // Register user service plugin
    await fastify.register(userPlugin);

    // Register market service plugin
    await fastify.register(marketPlugin);

    // Register analytics service plugin
    await fastify.register(analyticsPlugin);

    // Register WebSocket plugin
    await fastify.register(websocketPlugin);

    // Register routes
    await fastify.register(usersRoutes);
    await fastify.register(messagesRoutes);
    await fastify.register(reactionsRoutes);
    await fastify.register(marketsRoutes);
    await fastify.register(analyticsRoutes);

    // Health check endpoint
    fastify.get('/health', {
      schema: {
        tags: ['health'],
        description: 'API health check',
        summary: 'Check if the API is running',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }, async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    fastify.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
