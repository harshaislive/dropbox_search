import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const POSTGRES_URL = process.env.VITE_POSTGRES_URL;

async function initializeDatabase() {
  if (!POSTGRES_URL) {
    console.error('VITE_POSTGRES_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await pool.query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase().catch(console.error);
