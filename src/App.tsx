import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { AuthForm } from './components/AuthForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SearchResults } from './components/SearchResults';
import { dropboxService, FileType, MediaType, DateFilter } from './services/api';
import { Calendar, Image, Video, Clock } from 'lucide-react';
import { UserCounter } from './components/UserCounter';
import { Header } from './components/layout/Header';

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
      const response = await dropboxService.search(searchTerm, mediaType, dateFilter);
      const endTime = Date.now();
      
      setSearchResults(response.matches);
      setHasMore(response.has_more);
      setCursor(response.cursor);
      setSearchStats({
        total: response.total,
        duration: (endTime - startTime) / 1000
      });
    } catch (err) {
      setError('Failed to search files. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, mediaType, dateFilter]);

  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await dropboxService.continueSearch(cursor);
      setSearchResults(prev => [...prev, ...response.matches]);
      setHasMore(response.has_more);
      setCursor(response.cursor);
    } catch (err) {
      setError('Failed to load more results. Please try again.');
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchTerm.trim()) {
      searchTimeout.current = setTimeout(() => {
        handleSearch();
      }, 500);
    } else {
      setSearchResults([]);
      setSearchStats(null);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm, mediaType, dateFilter, handleSearch]);

  const handleMediaTypeChange = (type: MediaType) => {
    setMediaType(type);
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4">
        {/* Search Input */}
        <div className="mt-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your files..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4">
          {/* Media Type Filters */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleMediaTypeChange('all')}
              className={`px-3 py-1 rounded-full flex items-center space-x-1 ${
                mediaType === 'all' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>All</span>
            </button>
            <button
              onClick={() => handleMediaTypeChange('image')}
              className={`px-3 py-1 rounded-full flex items-center space-x-1 ${
                mediaType === 'image' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Image className="w-4 h-4" />
              <span>Images</span>
            </button>
            <button
              onClick={() => handleMediaTypeChange('video')}
              className={`px-3 py-1 rounded-full flex items-center space-x-1 ${
                mediaType === 'video' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Videos</span>
            </button>
          </div>

          {/* Date Filters */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleDateFilterChange('all')}
              className={`px-3 py-1 rounded-full flex items-center space-x-1 ${
                dateFilter === 'all' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>All time</span>
            </button>
            <button
              onClick={() => handleDateFilterChange('past_month')}
              className={`px-3 py-1 rounded-full flex items-center space-x-1 ${
                dateFilter === 'past_month' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Past month</span>
            </button>
          </div>
        </div>

        {/* Search Stats */}
        {searchStats && (
          <div className="text-sm text-gray-600">
            Found {searchStats.total} results in {searchStats.duration.toFixed(2)} seconds
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-red-600">
            {error}
          </div>
        )}

        {/* Search Results */}
        <SearchResults
          results={searchResults}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-6">
        <SearchApp />
        <UserCounter />
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}

export default App;