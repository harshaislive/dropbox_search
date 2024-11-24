import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface SearchAnalytics {
  query: string;
  user: string;
  timestamp: string;
  results: number;
}

interface UserAnalytics {
  username: string;
  searchCount: number;
  lastActive: string;
}

export const AdminPanel: React.FC = () => {
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalytics[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'users'>('search');
  const { user } = useAuth();

  // In a real app, this would fetch from a database
  useEffect(() => {
    // Simulated data
    setSearchAnalytics([
      { query: 'sustainability', user: 'john@beforest.co', timestamp: new Date().toISOString(), results: 5 },
      { query: 'forest', user: 'jane@beforest.co', timestamp: new Date().toISOString(), results: 3 },
    ]);

    setUserAnalytics([
      { username: 'john@beforest.co', searchCount: 15, lastActive: new Date().toISOString() },
      { username: 'jane@beforest.co', searchCount: 8, lastActive: new Date().toISOString() },
    ]);
  }, []);

  if (!user?.isAdmin) {
    return <div className="text-center py-8">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('search')}
              className={`${
                activeTab === 'search'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              Search Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              User Analytics
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'search' ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Searches</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Results
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchAnalytics.map((search, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{search.query}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{search.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(search.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{search.results}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">User Activity</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Searches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userAnalytics.map((user, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.searchCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.lastActive).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
