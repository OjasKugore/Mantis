import pg from 'pg';
import { initInMemoryFallbackDb } from './initFallback';

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __mantis_db_pool: any;
  // eslint-disable-next-line no-var
  var __mantis_db_init_promise: Promise<void> | undefined;
}

export function getPool(): any {
  return globalThis.__mantis_db_pool;
}

export function setPool(newPool: any) {
  globalThis.__mantis_db_pool = newPool;
}

export const db = {
  query: async (text: string, params?: any[]) => {
    await ensureDbReady();
    return globalThis.__mantis_db_pool.query(text, params);
  },
  getClient: async () => {
    await ensureDbReady();
    return globalThis.__mantis_db_pool.connect();
  },
  get pool() {
    return globalThis.__mantis_db_pool;
  },
};

export async function ensureDbReady(): Promise<void> {
  if (globalThis.__mantis_db_pool) return;
  if (globalThis.__mantis_db_init_promise) return globalThis.__mantis_db_init_promise;

  globalThis.__mantis_db_init_promise = (async () => {
    if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
      try {
        const isRemote =
          process.env.DATABASE_URL.includes('neon.tech') ||
          process.env.DATABASE_URL.includes('sslmode=require') ||
          process.env.NODE_ENV === 'production';

        const testPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: isRemote ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        await testPool.query('SELECT 1');
        globalThis.__mantis_db_pool = testPool;
        console.log('✓ Connected to PostgreSQL database at DATABASE_URL');
        return;
      } catch (err: any) {
        console.warn('⚠️ Could not connect to DATABASE_URL, using in-memory PostgreSQL engine:', err.message);
      }
    }

    await initInMemoryFallbackDb();
  })();

  return globalThis.__mantis_db_init_promise;
}

export default db;
