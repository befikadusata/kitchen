import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://oz_admin:oz_password_2026@localhost:5432/oz_kitchen',
});

// Helper for simple queries
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Initialization logic
export async function initDb() {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  try {
    await pool.query(schema);
    console.log('PostgreSQL schema initialized.');
  } catch (err) {
    console.error('Error initializing PostgreSQL schema:', err);
    throw err;
  }
}

export default {
  query,
  pool,
  // Compatibility wrapper for the sync better-sqlite3 style if needed, 
  // but better to migrate server.ts to async/await
  prepare: (sql: string) => {
    return {
      all: async (params: any[] = []) => {
        const res = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
        return res.rows;
      },
      get: async (params: any[] = []) => {
        const res = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
        return res.rows[0];
      },
      run: async (params: any[] = []) => {
        return pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      }
    };
  }
};
