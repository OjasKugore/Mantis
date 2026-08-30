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
        try {
          await testPool.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);
            ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;
            CREATE UNIQUE INDEX IF NOT EXISTS products_team_name_lower_name_idx ON products (COALESCE(team_name, 'Mozilla'), LOWER(name));
            CREATE TABLE IF NOT EXISTS named_queries (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR(64) NOT NULL,
              name VARCHAR(64) NOT NULL,
              query_json JSONB NOT NULL
            );
            UPDATE products 
            SET team_name = 'Mozilla'
            WHERE (team_name IS NULL OR team_name = '') AND (id IN (1, 2, 3) OR LOWER(name) IN ('firefox', 'thunderbird', 'core'));
          `);
        } catch {
          // non-fatal if table already updated or permissions limited
        }
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
