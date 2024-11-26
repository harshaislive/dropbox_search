import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SearchResults } from './SearchResults';
import { dropboxService } from '../services/api';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import { FileType } from '../types';
import { MediaType, DateFilter } from '../types';

export const SearchContainer: React.FC = () => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<FileType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const results = await dropboxService.searchFiles(searchTerm, mediaType, dateFilter);
      const duration = Date.now() - startTime;

      if (user?.email) {
        await analyticsService.recordSearch({
          email: user.email,
          query: searchTerm,
          timestamp: new Date(),
          resultCount: results.length,
          searchDuration: duration,
          mediaType,
          dateFilter
        });
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search files. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, mediaType, dateFilter, user?.email]);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchTerm) {
      searchTimeout.current = setTimeout(handleSearch, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm, handleSearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search files..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaType)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <SearchResults results={searchResults} />
      )}
    </div>
  );
};
