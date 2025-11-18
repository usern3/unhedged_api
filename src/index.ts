import 'dotenv/config';
import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma';
import websocketPlugin from './plugins/websocket';
import usersRoutes from './routes/users';
import messagesRoutes from './routes/messages';
import reactionsRoutes from './routes/reactions';

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
    // Register Prisma plugin
    await fastify.register(prismaPlugin);

    // Register WebSocket plugin
    await fastify.register(websocketPlugin);

    // Register routes
    await fastify.register(usersRoutes, { prefix: '/api' });
    await fastify.register(messagesRoutes, { prefix: '/api' });
    await fastify.register(reactionsRoutes, { prefix: '/api' });

    // Health check endpoint
    fastify.get('/health', async () => {
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
