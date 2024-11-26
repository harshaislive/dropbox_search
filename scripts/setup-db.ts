import { Pool } from 'pg';

const pool = new Pool({
  host: 'junction.proxy.rlwy.net',
  database: 'railway',
  user: 'postgres',
  password: 'HQbKkdgEToGyHZTlzjYMyjNEimqpjVDR',
  port: 5432,
});

async function createTables() {
  try {
    // Create search_analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        query TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        result_count INTEGER NOT NULL,
        search_duration INTEGER NOT NULL,
        media_type VARCHAR(50) NOT NULL,
        date_filter VARCHAR(50) NOT NULL
      );
    `);
    console.log('Created search_analytics table');

    // Create user_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        login_time TIMESTAMP NOT NULL,
        logout_time TIMESTAMP,
        search_count INTEGER NOT NULL
      );
    `);
    console.log('Created user_sessions table');

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_email ON search_analytics(email);
      CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
    `);
    console.log('Created indexes');

  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables();
