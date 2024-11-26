import { Pool } from 'pg';
import { SearchAnalytics, UserSession, AnalyticsSummary } from '../types/analytics';

const POSTGRES_URL = import.meta.env.VITE_POSTGRES_URL;
const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
const ANALYTICS_ADMIN_EMAILS = (import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS || '').split(',');

const pool = ANALYTICS_ENABLED ? new Pool({
  connectionString: POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000
}) : null;

export const analyticsService = {
  async recordSearch(analytics: Omit<SearchAnalytics, 'id'>): Promise<void> {
    if (!ANALYTICS_ENABLED || !pool) return;

    const query = `
      INSERT INTO search_analytics 
      (email, query, timestamp, result_count, search_duration, media_type, date_filter)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    try {
      await pool.query(query, [
        analytics.email,
        analytics.query,
        analytics.timestamp,
        analytics.resultCount,
        analytics.searchDuration,
        analytics.mediaType,
        analytics.dateFilter,
      ]);
    } catch (error) {
      console.error('Failed to record search analytics:', error);
    }
  },

  async recordSession(session: Omit<UserSession, 'id'>): Promise<void> {
    if (!ANALYTICS_ENABLED || !pool) return;

    const query = `
      INSERT INTO user_sessions 
      (email, login_time, logout_time, search_count)
      VALUES ($1, $2, $3, $4)
    `;
    
    try {
      await pool.query(query, [
        session.email,
        session.loginTime,
        session.logoutTime,
        session.searchCount,
      ]);
    } catch (error) {
      console.error('Failed to record session:', error);
    }
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    if (!ANALYTICS_ENABLED || !pool) {
      return {
        totalSearches: 0,
        averageSearchDuration: 0,
        popularQueries: [],
        searchesByMediaType: {},
        mostActiveUsers: []
      };
    }

    try {
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
        LIMIT 5
      `);

      const mediaTypeQuery = await pool.query(`
        SELECT media_type, COUNT(*) as count 
        FROM search_analytics 
        GROUP BY media_type
      `);

      const activeUsersQuery = await pool.query(`
        SELECT email, COUNT(*) as search_count 
        FROM search_analytics 
        GROUP BY email 
        ORDER BY search_count DESC 
        LIMIT 5
      `);

      return {
        totalSearches: parseInt(totalSearchesQuery.rows[0].total) || 0,
        averageSearchDuration: parseFloat(avgDurationQuery.rows[0].avg_duration) || 0,
        popularQueries: popularQueriesQuery.rows.map(row => ({
          query: row.query,
          count: parseInt(row.count)
        })),
        searchesByMediaType: mediaTypeQuery.rows.reduce((acc, row) => ({
          ...acc,
          [row.media_type]: parseInt(row.count)
        }), {}),
        mostActiveUsers: activeUsersQuery.rows.map(row => ({
          email: row.email,
          searchCount: parseInt(row.search_count)
        }))
      };
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return {
        totalSearches: 0,
        averageSearchDuration: 0,
        popularQueries: [],
        searchesByMediaType: {},
        mostActiveUsers: []
      };
    }
  },

  async isAnalyticsUser(email: string): Promise<boolean> {
    if (!ANALYTICS_ENABLED) return false;
    return ANALYTICS_ADMIN_EMAILS.some(adminEmail => 
      email.toLowerCase().includes(adminEmail.toLowerCase().trim())
    );
  }
};
