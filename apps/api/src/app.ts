import fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { authRoutes } from './routes/auth.js';
import { bugRoutes } from './routes/bugs.js';
import { commentRoutes } from './routes/comments.js';
import { notificationRoutes } from './routes/notifications.js';
import { flagRoutes } from './routes/flags.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
  });

  // Cookie plugin
  await app.register(fastifyCookie, {
    secret: process.env.SESSION_SECRET || 'session-secret-change-me-in-prod-min32chars',
    parseOptions: {},
  });

  // CORS plugin
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // OpenAPI Swagger Documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'BugzillaRevamp API',
        description: 'Modernized Enterprise Defect, Vulnerability & Governance Platform API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Local Development Server',
        },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    if (process.env.NODE_ENV === 'test') {
      console.error('FASTIFY ERROR:', error);
    }
    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Internal server error',
    });
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // API v1 routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(bugRoutes, { prefix: '/api/v1/bugs' });
  await app.register(commentRoutes, { prefix: '/api/v1' });
  await app.register(notificationRoutes, { prefix: '/api/v1' });
  await app.register(flagRoutes, { prefix: '/api/v1' });

  return app;
}

export default buildApp;

