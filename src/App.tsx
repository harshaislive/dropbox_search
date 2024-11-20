import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { SearchResults } from './components/SearchResults';
import { dropboxService, FileType, MediaType, DateFilter } from './services/api';
import { Calendar, Image, Video, Clock } from 'lucide-react';

function App() {
  const [searchResults, setSearchResults] = useState<FileType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchStats, setSearchStats] = useState<{ duration: number; total: number } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSearchResults([]); // Clear previous results when starting a new search
    setCursor(null); // Reset cursor for new search
    
    try {
      const startTime = performance.now();
      const response = await dropboxService.searchFiles({ 
        query: searchTerm,
        mediaType,
        dateFilter
      });
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      
      setSearchResults(response.files);
      setHasMore(response.hasMore);
      setCursor(response.cursor);
      setSearchStats({
        duration: Number(duration.toFixed(2)),
        total: response.total
      });
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, mediaType, dateFilter]);

  const loadMore = async () => {
    if (!cursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    setError(null);
    
    try {
      const response = await dropboxService.searchFiles({
        query: searchTerm,
        mediaType,
        dateFilter,
        cursor
      });
      
      setSearchResults(prev => [...prev, ...response.files]);
      setHasMore(response.hasMore);
      setCursor(response.cursor);
      if (searchStats) {
        setSearchStats(prev => prev ? {
          ...prev,
          total: response.total
        } : null);
      }
    } catch (err) {
      console.error('Load more error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading more results');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(handleSearch, 500);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm, mediaType, dateFilter, handleSearch]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const getDateFilterLabel = (filter: DateFilter): string => {
    switch (filter) {
      case 'today': return 'Today';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_year': return 'This Year';
      default: return 'All Time';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={handleSearchInput}
                className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              
              {/* Search Stats */}
              {searchStats && searchTerm && !isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  {searchStats.total} results ({searchStats.duration}s)
                </div>
              )}
            </div>

            {/* Filter Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
              {/* Media Type Filters */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Media Type</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setMediaType('all')}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      mediaType === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    All
                  </button>
                  <button
                    onClick={() => setMediaType('images')}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      mediaType === 'images'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Image className="h-4 w-4 mr-1" />
                    Images
                  </button>
                  <button
                    onClick={() => setMediaType('videos')}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      mediaType === 'videos'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Videos
                  </button>
                </div>
              </div>

              {/* Date Filters */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Date Modified</h3>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'today', 'this_week', 'this_month', 'last_month', 'this_year'] as DateFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                        dateFilter === filter
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      {getDateFilterLabel(filter)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && searchResults.length > 0 && (
          <>
            <SearchResults results={searchResults} />
            {hasMore && (
              <div className="flex justify-center mt-6 mb-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Load More</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No results found' : 'Start typing to search for files'}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;