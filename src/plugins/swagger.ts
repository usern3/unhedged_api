import { FastifyPluginAsync } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

/**
 * Swagger Documentation Plugin
 *
 * Provides OpenAPI 3.0 documentation for the API
 * Access documentation at: /documentation
 */
const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Register @fastify/swagger for OpenAPI schema generation
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Unhedged API',
        description: 'Prediction markets platform API with real-time messaging, market analytics, and DAML integration',
        version: '1.0.0',
        contact: {
          name: 'API Support',
        },
        license: {
          name: 'ISC',
        },
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
        },
      ],
      tags: [
        { name: 'users', description: 'User management endpoints' },
        { name: 'messages', description: 'Trollbox messaging endpoints' },
        { name: 'reactions', description: 'Message reaction endpoints' },
        { name: 'markets', description: 'Prediction market discovery' },
        { name: 'analytics', description: 'Platform and user analytics' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      components: {
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
              message: { type: 'string', description: 'Detailed error description' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'User ID' },
              username: { type: 'string', description: 'Unique username' },
              walletAddress: { type: 'string', nullable: true, description: 'Blockchain wallet address' },
              avatar: { type: 'string', nullable: true, description: 'Avatar URL or identifier' },
              createdAt: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
            },
          },
          Message: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'Message ID' },
              content: { type: 'string', maxLength: 1000, description: 'Message content' },
              userId: { type: 'string', format: 'uuid', description: 'Author user ID' },
              isEdited: { type: 'boolean', description: 'Whether message has been edited' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
            },
          },
          Reaction: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'Reaction ID' },
              emoji: { type: 'string', maxLength: 10, description: 'Emoji character' },
              messageId: { type: 'string', format: 'uuid', description: 'Message ID' },
              userId: { type: 'string', format: 'uuid', description: 'User ID who reacted' },
              createdAt: { type: 'string', format: 'date-time', description: 'Reaction timestamp' },
            },
          },
          Market: {
            type: 'object',
            properties: {
              contractId: { type: 'string', description: 'DAML contract ID' },
              question: { type: 'string', description: 'Market question' },
              description: { type: 'string', description: 'Market description' },
              category: { type: 'string', description: 'Market category' },
              status: { type: 'string', enum: ['active', 'settled', 'cancelled'], description: 'Market status' },
              tokenStandard: { type: 'string', enum: ['splice-cc', 'cip-56'], description: 'Token standard' },
              resolutionTime: { type: 'string', format: 'date-time', nullable: true, description: 'Resolution deadline' },
              createdAt: { type: 'string', format: 'date-time', description: 'Market creation time' },
              updatedAt: { type: 'string', format: 'date-time', description: 'Last update time' },
            },
          },
        },
      },
    },
    // Hide routes without tags from documentation
    hideUntagged: true,
    // Strip base path from routes in docs
    stripBasePath: true,
    // Transform function to customize schema generation
    transform: ({ schema, url }) => {
      // Add default tags if missing
      if (!schema.tags && url.includes('/users')) {
        schema.tags = ['users'];
      } else if (!schema.tags && url.includes('/messages')) {
        schema.tags = ['messages'];
      } else if (!schema.tags && url.includes('/reactions')) {
        schema.tags = ['reactions'];
      } else if (!schema.tags && url.includes('/markets')) {
        schema.tags = ['markets'];
      } else if (!schema.tags && url.includes('/analytics')) {
        schema.tags = ['analytics'];
      } else if (!schema.tags && url.includes('/health')) {
        schema.tags = ['health'];
      }

      return { schema, url };
    },
  });

  // Register @fastify/swagger-ui for documentation interface
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list', // 'list' | 'full' | 'none'
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      syntaxHighlight: {
        theme: 'monokai',
      },
    },
    staticCSP: true,
    transformSpecificationClone: true,
  });

  fastify.log.info('Swagger documentation registered at /docs');
};

export default swaggerPlugin;
