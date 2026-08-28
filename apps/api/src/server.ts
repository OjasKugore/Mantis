import dotenv from 'dotenv';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';

dotenv.config();

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    if (process.env.AUTO_MIGRATE !== 'false') {
      try {
        await runMigrations();
      } catch (err) {
        console.warn('Auto migration warning (will continue booting):', (err as Error).message);
      }
    }

    const app = await buildApp();
    await app.listen({ port, host });
    console.log(`🚀 BugzillaRevamp Fastify Server running on http://${host}:${port}`);
    console.log(`📚 Swagger UI documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
