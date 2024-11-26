import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsSummary } from '../types/analytics';
import { useAuth } from '../context/AuthContext';

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await analyticsService.getAnalyticsSummary();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-red-500">Failed to load analytics</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Search Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Searches Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Searches</h2>
          <p className="text-3xl font-bold">{analytics.totalSearches}</p>
        </div>

        {/* Average Duration Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Average Search Duration</h2>
          <p className="text-3xl font-bold">{(analytics.averageSearchDuration / 1000).toFixed(2)}s</p>
        </div>
      </div>

      {/* Popular Queries */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">Popular Queries</h2>
        <div className="space-y-2">
          {analytics.popularQueries.map((query, index) => (
            <div key={index} className="flex justify-between items-center">
              <span>{query.query}</span>
              <span className="font-semibold">{query.count} searches</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search by Media Type */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">Searches by Media Type</h2>
        <div className="space-y-2">
          {Object.entries(analytics.searchesByMediaType).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center">
              <span className="capitalize">{type}</span>
              <span className="font-semibold">{count} searches</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">Most Active Users</h2>
        <div className="space-y-2">
          {analytics.activeUsers.map((user, index) => (
            <div key={index} className="flex justify-between items-center">
              <span>{user.email}</span>
              <span className="font-semibold">{user.searchCount} searches</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
