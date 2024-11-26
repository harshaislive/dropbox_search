import { Pool } from 'pg';
import { SearchAnalytics, UserSession, AnalyticsSummary } from '../types/analytics';

const pool = new Pool({
  connectionString: import.meta.env.VITE_POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000
});

export const analyticsService = {
  async recordSearch(analytics: Omit<SearchAnalytics, 'id'>): Promise<void> {
    const query = `
      INSERT INTO search_analytics 
      (email, query, timestamp, result_count, search_duration, media_type, date_filter)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await pool.query(query, [
      analytics.email,
      analytics.query,
      analytics.timestamp,
      analytics.resultCount,
      analytics.searchDuration,
      analytics.mediaType,
      analytics.dateFilter,
    ]);
  },

  async recordSession(session: Omit<UserSession, 'id'>): Promise<void> {
    const query = `
      INSERT INTO user_sessions 
      (email, login_time, logout_time, search_count)
      VALUES ($1, $2, $3, $4)
    `;
    
    await pool.query(query, [
      session.email,
      session.loginTime,
      session.logoutTime,
      session.searchCount,
    ]);
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const totalSearchesQuery = await pool.query(
      'SELECT COUNT(*) as total FROM search_analytics'
    );

    const avgDurationQuery = await pool.query(
      'SELECT AVG(search_duration) as avg_duration FROM search_analytics'
    );

    const popularQueriesQuery = await pool.query(`
      SELECT query, COUNT(*) as count 
      FROM search_analytics 
      GROUP BY query 
      ORDER BY count DESC 
      LIMIT 10
    `);

    const mediaTypeQuery = await pool.query(`
      SELECT media_type, COUNT(*) as count 
      FROM search_analytics 
      GROUP BY media_type
    `);

    const dateFilterQuery = await pool.query(`
      SELECT date_filter, COUNT(*) as count 
      FROM search_analytics 
      GROUP BY date_filter
    `);

    const activeUsersQuery = await pool.query(`
      SELECT email, COUNT(*) as search_count 
      FROM search_analytics 
      GROUP BY email 
      ORDER BY search_count DESC 
      LIMIT 10
    `);

    return {
      totalSearches: parseInt(totalSearchesQuery.rows[0].total),
      averageSearchDuration: parseFloat(avgDurationQuery.rows[0].avg_duration),
      popularQueries: popularQueriesQuery.rows,
      searchesByMediaType: mediaTypeQuery.rows.reduce((acc, row) => ({
        ...acc,
        [row.media_type]: parseInt(row.count)
      }), {}),
      searchesByDateFilter: dateFilterQuery.rows.reduce((acc, row) => ({
        ...acc,
        [row.date_filter]: parseInt(row.count)
      }), {}),
      activeUsers: activeUsersQuery.rows,
    };
  },

  async isAnalyticsUser(email: string): Promise<boolean> {
    return email.includes('seshu') || email.includes('harsha');
  }
};
