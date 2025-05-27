import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SearchResults } from './SearchResults';
import { dropboxService } from '../services/api';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import { FileType, MediaType, DateFilter } from '../services/api';
import { Search } from 'lucide-react';

export const SearchContainer: React.FC = () => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<FileType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const searchTermRef = useRef('');

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchTermRef.current = value;
    console.log('[DEBUG] User typed search:', value);
  };

  const handleSearch = useCallback(async () => {
    const term = searchTermRef.current;
    console.log('[DEBUG] Performing search with:', term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const results = await dropboxService.searchFiles({ query: term, mediaType, dateFilter });
      const duration = Date.now() - startTime;

      if (user?.email) {
        await analyticsService.recordSearch({
          email: user.email,
          query: term,
          timestamp: new Date(),
          resultCount: results.files.length,
          searchDuration: duration,
          mediaType,
          dateFilter
        });
      }

      setSearchResults(results.files);
      setCursor(results.cursor || null);
      setHasMore(!!results.hasMore);

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

  // Handler for loading more results
  const loadMore = async () => {
    if (!cursor) return;
    setIsLoadingMore(true);
    try {
      const results = await dropboxService.continueSearch(cursor);
      setSearchResults(prev => [...prev, ...results.files]);
      setCursor(results.cursor || null);
      setHasMore(!!results.hasMore);
    } catch (err) {
      setError('Failed to load more results.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      {/* Centered Search Bar */}
      <div className="max-w-xl mx-auto mt-8 mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchInput}
            placeholder="Search files..."
            className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white/80 shadow-md"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>

      {/* Filters: left-aligned, match card grid width */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Media Type Filter */}
          <select
            value={mediaType}
            onChange={e => setMediaType(e.target.value as MediaType)}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">All Types</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
          </select>
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as DateFilter)}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
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
        <>
          <SearchResults results={searchResults} />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};
