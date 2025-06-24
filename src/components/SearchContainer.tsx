import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SearchResults } from './SearchResults';
import { dropboxService } from '../services/api';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import { FileType, MediaType, DateFilter } from '../services/api';
import { Search } from 'lucide-react';

interface SearchMetadata {
  searchTerm: string;
  totalResults: number;
  imageCount: number;
  videoCount: number;
  searchDuration: number;
  mediaType: MediaType;
  dateFilter: DateFilter;
  hasMore: boolean;
}

export const SearchContainer: React.FC = () => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<FileType[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<SearchMetadata | null>(null);
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

  const calculateResultBreakdown = (files: FileType[]) => {
    const imageCount = files.filter(file => !file.isVideo).length;
    const videoCount = files.filter(file => file.isVideo).length;
    return { imageCount, videoCount };
  };

  const handleSearch = useCallback(async () => {
    const term = searchTermRef.current;
    console.log('[DEBUG] Performing search with:', term);
    if (!term.trim()) {
      setSearchResults([]);
      setSearchMetadata(null);
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

      const { imageCount, videoCount } = calculateResultBreakdown(results.files);

      setSearchResults(results.files);
      setCursor(results.cursor || null);
      setHasMore(!!results.hasMore);
      setSearchMetadata({
        searchTerm: term,
        totalResults: results.files.length,
        imageCount,
        videoCount,
        searchDuration: duration,
        mediaType,
        dateFilter,
        hasMore: !!results.hasMore
      });

    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search files. Please try again.');
      setSearchResults([]);
      setSearchMetadata(null);
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
      setSearchMetadata(null);
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
      const newFiles = [...searchResults, ...results.files];
      const { imageCount, videoCount } = calculateResultBreakdown(newFiles);
      
      setSearchResults(newFiles);
      setCursor(results.cursor || null);
      setHasMore(!!results.hasMore);
      
      // Update metadata with new totals
      if (searchMetadata) {
        setSearchMetadata({
          ...searchMetadata,
          totalResults: newFiles.length,
          imageCount,
          videoCount,
          hasMore: !!results.hasMore
        });
      }
    } catch (error) {
      console.error('Load more error:', error);
      setError('Failed to load more results.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      {/* Search Bar and Filters in one row */}
      <div className="max-w-3xl mx-auto mt-8 mb-8 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchInput}
            placeholder="Search files..."
            className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white/80 shadow-md"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
        <div className="flex flex-row gap-3 min-w-fit">
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
          {/* Search Results Header with Statistics */}
          {searchMetadata && searchResults.length > 0 && (
            <SearchResultsHeader metadata={searchMetadata} />
          )}
          
          <SearchResults results={searchResults} />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-brand-forest text-brand-offwhite rounded shadow hover:bg-brand-olive disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-forest focus:ring-offset-2 uppercase"
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
          
          {searchMetadata && searchResults.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium mb-2">No results found</div>
              <div className="text-sm">
                No files found for "{searchMetadata.searchTerm}"
                {searchMetadata.mediaType !== 'all' && (
                  <span> in {searchMetadata.mediaType}</span>
                )}
                {searchMetadata.dateFilter !== 'all' && (
                  <span> from {searchMetadata.dateFilter.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

// Search Results Header Component
const SearchResultsHeader: React.FC<{ metadata: SearchMetadata }> = ({ metadata }) => {
  const formatSearchDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getFilterText = (mediaType: MediaType, dateFilter: DateFilter) => {
    const parts = [];
    if (mediaType !== 'all') {
      parts.push(mediaType);
    }
    if (dateFilter !== 'all') {
      parts.push(dateFilter.replace('_', ' '));
    }
    return parts.length > 0 ? parts.join(', ') : 'all files';
  };

  const getResultBreakdown = () => {
    const parts = [];
    if (metadata.imageCount > 0) {
      parts.push(`${metadata.imageCount} image${metadata.imageCount !== 1 ? 's' : ''}`);
    }
    if (metadata.videoCount > 0) {
      parts.push(`${metadata.videoCount} video${metadata.videoCount !== 1 ? 's' : ''}`);
    }
    return parts.join(', ');
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {metadata.totalResults} result{metadata.totalResults !== 1 ? 's' : ''} for "{metadata.searchTerm}"
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {getResultBreakdown() && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-brand-forest rounded-full"></span>
                  {getResultBreakdown()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                {getFilterText(metadata.mediaType, metadata.dateFilter)}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                found in {formatSearchDuration(metadata.searchDuration)}
              </span>
              {metadata.hasMore && (
                <span className="flex items-center gap-1 text-brand-forest font-medium">
                  <span className="w-2 h-2 bg-brand-forest rounded-full animate-pulse"></span>
                  more available
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
