import { FastifyPluginAsync } from 'fastify';
import websocket, { WebSocket } from '@fastify/websocket';
import fp from 'fastify-plugin';

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  // WebSocket route for real-time chat
  fastify.get('/ws', { websocket: true }, (socket) => {
    fastify.log.info('WebSocket client connected');

    // Handle incoming messages
    socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'message':
            // Broadcast new message to all connected clients
            fastify.websocketServer.clients.forEach((client: WebSocket) => {
              if (client.readyState === 1) { // OPEN
                client.send(JSON.stringify({
                  type: 'new_message',
                  data: data.payload,
                }));
              }
            });
            break;

          case 'reaction':
            // Broadcast new reaction
            fastify.websocketServer.clients.forEach((client: WebSocket) => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'new_reaction',
                  data: data.payload,
                }));
              }
            });
            break;

          case 'ping':
            // Respond to ping
            socket.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            fastify.log.warn(`Unknown WebSocket message type: ${data.type}`);
        }
      } catch (error: unknown) {
        fastify.log.error({ error }, 'WebSocket message error');
      }
    });

    socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
    });

    socket.on('error', (error: Error) => {
      fastify.log.error({ error }, 'WebSocket error');
    });

    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to trollbox'
    }));
  });
};

export default fp(websocketPlugin);
