import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { AuthForm } from './components/AuthForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SearchResults } from './components/SearchResults';
import { dropboxService, FileType, MediaType, DateFilter } from './services/api';
import { Calendar, Image, Video, Clock } from 'lucide-react';

const SearchApp: React.FC = () => {
  const [searchResults, setSearchResults] = useState<FileType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [hasMore, setHasMore] = useState(true);
  const [searchStats, setSearchStats] = useState<{ total: number; duration: number } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchStats(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setCursor(null);
    
    try {
      const startTime = Date.now();
      const response = await dropboxService.searchFiles({ query: searchTerm, mediaType, dateFilter });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      setSearchResults(response.files || []);
      setHasMore(response.hasMore || false);
      setCursor(response.cursor || null);
      setSearchStats({ total: response.files?.length || 0, duration: parseFloat(duration) });
    } catch (err) {
      setError('Failed to search files. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, mediaType, dateFilter]);

  const loadMore = async () => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await dropboxService.continueSearch(cursor);
      setSearchResults(prev => [...prev, ...(response.files || [])]);
      setHasMore(response.hasMore || false);
      setCursor(response.cursor || null);
    } catch (err) {
      console.error('Load more error:', err);
      setError('Failed to load more results. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim()) {
      searchTimeout.current = setTimeout(() => {
        handleSearch();
      }, 500);
    } else {
      setSearchResults([]);
      setSearchStats(null);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch();
    }
  }, [mediaType, dateFilter]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="max-w-3xl mx-auto">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={handleSearchInput}
                className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
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
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Media Type</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMediaType('all')}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                    mediaType === 'all'
                      ? 'bg-brand/10 text-brand'
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
                      ? 'bg-brand/10 text-brand'
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
                      ? 'bg-brand/10 text-brand'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Video className="h-4 w-4 mr-1" />
                  Videos
                </button>
              </div>
            </div>

            {/* Date Filters */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Date Modified</h3>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', 'this_week', 'this_month', 'last_month', 'this_year'] as DateFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      dateFilter === filter
                        ? 'bg-brand/10 text-brand'
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

          {/* Search Results */}
          <div className="mt-8">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                <p className="mt-2 text-gray-600">Searching...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                {error}
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <SearchResults results={searchResults} />
                {hasMore && (
                  <div className="text-center mt-4">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90 disabled:opacity-50"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            ) : searchTerm && !isLoading ? (
              <div className="text-center py-8 text-gray-600">
                No results found
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <Layout>
      <SearchApp />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
};

export default App;