import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running database migrations (001_initial.sql)...');
    await client.query(sql);
    console.log('Migrations completed successfully.');
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      const code = err.code || '';
      console.error('\n\x1b[31m✘  Migration failed!\x1b[0m');

      if (code === '28P01') {
        console.error('\n   Cause: Password authentication failed for user "bz".');
        console.error('   This usually means a LOCAL (non-Docker) PostgreSQL service is');
        console.error('   running on port 5432 and intercepting the connection.\n');
        console.error('   Fix:');
        console.error('     1. Stop the local PostgreSQL service:');
        console.error('          Windows (Admin):  net stop postgresql-x64-16');
        console.error('          macOS:            brew services stop postgresql@16');
        console.error('          Linux:            sudo systemctl stop postgresql');
        console.error('     2. Reset Docker volume and restart:');
        console.error('          docker compose down -v');
        console.error('          docker compose up -d db');
        console.error('          npm run migrate');
        console.error('\n   Tip: Run `npm run preflight` to auto-detect all environment issues.\n');
      } else if (code === 'ECONNREFUSED') {
        console.error('\n   Cause: Cannot connect to PostgreSQL on localhost:5432.');
        console.error('   The Docker database container is not running.\n');
        console.error('   Fix:');
        console.error('     1. Make sure Docker Desktop is open and running.');
        console.error('     2. Start the database:  docker compose up -d db');
        console.error('     3. Wait 5 seconds, then retry:  npm run migrate\n');
      } else if (code === 'ETIMEDOUT') {
        console.error('\n   Cause: Connection to PostgreSQL timed out.');
        console.error('   The Docker container may still be initializing.\n');
        console.error('   Fix:  Wait 10 seconds, then retry: npm run migrate\n');
      } else if (code === '3D000') {
        console.error('\n   Cause: Database "mantis" does not exist.');
        console.error('   The Docker container started but the DB was not created.\n');
        console.error('   Fix:');
        console.error('     docker compose down -v && docker compose up -d db');
        console.error('     npm run migrate\n');
      } else {
        console.error('\n   Error details:', err.message);
        console.error('\n   Tip: Run `npm run preflight` for a full environment check.\n');
      }
      process.exit(1);
    });
}
