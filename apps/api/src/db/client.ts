import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isRemoteDb =
  Boolean(process.env.DATABASE_URL?.includes('neon.tech')) ||
  Boolean(process.env.DATABASE_URL?.includes('sslmode=require')) ||
  process.env.NODE_ENV === 'production';

export let pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://bz:bz@localhost:5432/mantis',
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = {
  query: async (text: string, params?: any[]) => {
    return pool.query(text, params);
  },
  getClient: async () => pool.connect(),
  pool,
};

export function setPool(newPool: any) {
  pool = newPool;
  db.pool = newPool;
}

export default db;
