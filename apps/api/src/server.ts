import dotenv from 'dotenv';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { initInMemoryFallbackDb } from './db/initFallback.js';

dotenv.config();

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    let dbReady = false;
    if (process.env.AUTO_MIGRATE !== 'false') {
      try {
        await runMigrations();
        dbReady = true;
      } catch (err) {
        console.warn('PostgreSQL connection failed. Activating high-performance in-memory database fallback...');
        await initInMemoryFallbackDb();
        dbReady = true;
      }
    }

    if (!dbReady) {
      try {
        await initInMemoryFallbackDb();
      } catch (err) {
        console.warn('DB initialization notice:', (err as Error).message);
      }
    }

    const app = await buildApp();
    await app.listen({ port, host });
    console.log(`🚀 Mantis Fastify Server running on http://${host}:${port}`);
    console.log(`📚 Swagger UI documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
