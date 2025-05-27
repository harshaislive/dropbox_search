// NOTE: All analytics logic should be handled via backend API calls.
// Removed Node.js/pg usage from frontend. See backend for implementation.
import { SearchAnalytics, UserSession, AnalyticsSummary } from '../types/analytics';

const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
const ANALYTICS_ADMIN_EMAILS = (import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS || '').split(',');

export const analyticsService = {
  // TODO: Implement these methods to call your backend API endpoints
  async recordSearch(_analytics: Omit<SearchAnalytics, 'id'>): Promise<void> {
    // Example: await fetch('/api/analytics/record-search', { method: 'POST', body: ... })
    return;
  },

  async recordSession(_session: Omit<UserSession, 'id'>): Promise<void> {
    // Example: await fetch('/api/analytics/record-session', { method: 'POST', body: ... })
    return;
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    // Example: return await fetch('/api/analytics/summary').then(res => res.json());
    return {
      totalSearches: 0,
      averageSearchDuration: 0,
      popularQueries: [],
      searchesByMediaType: {},
      mostActiveUsers: []
    };
  },

  async isAnalyticsUser(email: string): Promise<boolean> {
    if (!ANALYTICS_ENABLED) return false;
    return ANALYTICS_ADMIN_EMAILS.some(adminEmail => 
      email.toLowerCase().includes(adminEmail.toLowerCase().trim())
    );
  }
};
