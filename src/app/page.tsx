'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Download, Loader2, Calendar, X, ChevronLeft, ChevronRight, Copy, Check, Play, Pause, Volume2, VolumeX, Filter, ImageIcon, Folder } from 'lucide-react';
import Link from 'next/link';
import VideoThumbnail from '../components/VideoThumbnail';
import ResponsiveThumbnail from '../components/ResponsiveThumbnail';
import { isVideoFile, getFileType } from '../utils/fileTypes';

interface SearchResult {
  id: string;
  dropbox_path: string;
  file_name?: string;
  caption?: string;
  tags?: string[];
  similarity: number;
  similarity_percentage?: number;
  public_url?: string;
  thumbnail_url?: string;
  download_url?: string;
  file_type?: string;
  file_size?: number;
  source: 'vector' | 'text' | 'hybrid' | 'dropbox' | 'unknown';
  search_source?: string;
  enhanced: boolean;
  metadata?: Record<string, any>;
  modified_date?: string;
  processed_date?: string;
  file_extension?: string;
  advanced_scores?: {
    composite: number;
    vector: number;
    text: number;
    tag: number;
    quality: number;
  };
}

interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  query: string;
  processingTime: number;
  searchStrategy: string;
  hasMore: boolean;
  currentPage: number;
  cursor?: string;
  error?: string;
}

interface DateFilter {
  start?: string;
  end?: string;
}

export default function BeforestImageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [mediaType, setMediaType] = useState<'all' | 'images' | 'videos'>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const resultsPerPage = 50;

  // Preview modal states
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const searchImages = async (searchQuery: string, pageNum: number = 1, append: boolean = false, useCursor?: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setHasMore(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Stop any playing video when searching
    setActiveVideoId(null);
    setIsPlaying(false);

    try {
      if (pageNum === 1 && !append) {
        setCursor(undefined);
      }

      let apiEndpoint: string;
      let requestBody: any = {};

      // Always use Dropbox file search
      apiEndpoint = '/api/search/dropbox';
      requestBody = {
        query: searchQuery,
        max_results: resultsPerPage,
        cursor: useCursor || cursor,
        search_type: mediaType === 'videos' ? 'video' : 'media'
      };
      
      console.log(`[SEARCH] Using Dropbox file search API:`, apiEndpoint);
      
      console.log(`[SEARCH] Using endpoint: ${apiEndpoint}`, requestBody);
      console.log(`[SEARCH] Cursor values - useCursor: ${useCursor}, current cursor state: ${cursor}`);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Search failed');

      const data: any = await response.json();
      
      // Normalize response
      if (apiEndpoint === '/api/search/dropbox') {
        const normalizedData: SearchResponse = {
          results: data.files.map((file: any) => ({
            ...file,
            similarity: file.similarity_percentage / 100,
          })),
          totalFound: data.total_found,
          query: data.query,
          processingTime: data.processing_time,
          searchStrategy: data.search_strategy,
          hasMore: data.has_more,
          currentPage: pageNum,
          cursor: data.cursor
        };
        handleSearchResponse(normalizedData, append, pageNum);
      } else {
        handleSearchResponse(data, append, pageNum);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResponse = (data: SearchResponse, append: boolean, pageNum: number) => {
    // Filter by media type if needed
    let filteredResults = data.results;
    if (mediaType !== 'all') {
      filteredResults = data.results.filter(result => {
        const fileType = getFileType(result.file_name || '');
        return mediaType === 'videos' ? fileType === 'video' : fileType === 'image';
      });
    }

    setResults(append ? [...results, ...filteredResults] : filteredResults);
    setHasMore(data.hasMore);
    setTotalResults(data.totalFound);
    setPage(pageNum);
    if (data.cursor) {
      console.log(`[RESPONSE] Setting new cursor: ${data.cursor}`);
      setCursor(data.cursor);
    } else {
      console.log(`[RESPONSE] No cursor in response, keeping current: ${cursor}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setActiveVideoId(null);
    setIsPlaying(false);
    
    console.log(`[SEARCH] Starting search with query: "${query}"`);
    
    searchImages(query, 1, false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      console.log(`[LOAD_MORE] Current cursor: ${cursor}, page: ${page}`);
      searchImages(query, page + 1, true, cursor);
    }
  };

  const openPreview = (result: SearchResult, index: number) => {
    setPreviewResult(result);
    setPreviewIndex(index);
    setShowPreview(true);
    setCopied(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIsDragging(false);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewResult(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIsDragging(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const navigatePreview = (direction: 'prev' | 'next') => {
    if (!results.length) return;
    
    let newIndex = previewIndex;
    if (direction === 'prev') {
      newIndex = previewIndex > 0 ? previewIndex - 1 : results.length - 1;
    } else {
      newIndex = previewIndex < results.length - 1 ? previewIndex + 1 : 0;
    }
    
    setPreviewIndex(newIndex);
    setPreviewResult(results[newIndex]);
    setCopied(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIsDragging(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    
    // Immediately update position on mouse down
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pos * duration;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Handle global mouse events for video scrubbing
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !videoRef.current || !progressRef.current) return;
      
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pos * duration;
      
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging, duration]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPreview) return;
      
      switch (e.key) {
        case 'Escape':
          closePreview();
          break;
        case 'ArrowLeft':
          navigatePreview('prev');
          break;
        case 'ArrowRight':
          navigatePreview('next');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreview, previewIndex, results.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/23-Beforest-Black-with-Tagline.png" 
                alt="Beforest" 
                className="h-5 sm:h-7 w-auto"
              />
              <div className="hidden md:block w-px h-5 bg-gray-300" />
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 hidden sm:block">Gallery</h1>
            </div>
            
            <Link 
              href="/recent"
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Recent</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Controls */}
      <div className="gallery-search-controls">
        <form onSubmit={handleSearch} className="gallery-search-bar">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-[var(--beforest-forest-green)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your photos and videos..."
              className="gallery-search-input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="gallery-search-button absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-[var(--beforest-forest-green)] to-[var(--beforest-olive-green)] text-white rounded-full disabled:opacity-50 text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Controls */}
        <div className="gallery-toggles">

          {/* Media Type */}
          <div className="gallery-toggle-group">
            <button
              type="button"
              onClick={() => {
                setMediaType('all');
                // Clear results only, don't auto-search
                setResults([]);
                setCursor(undefined);
                setPage(1);
                setTotalResults(0);
                setHasMore(false);
              }}
              className={`gallery-toggle ${mediaType === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaType('images');
                // Clear results only, don't auto-search
                setResults([]);
                setCursor(undefined);
                setPage(1);
                setTotalResults(0);
                setHasMore(false);
              }}
              className={`gallery-toggle ${mediaType === 'images' ? 'active' : ''}`}
            >
              Photos
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaType('videos');
                // Clear results only, don't auto-search
                setResults([]);
                setCursor(undefined);
                setPage(1);
                setTotalResults(0);
                setHasMore(false);
              }}
              className={`gallery-toggle ${mediaType === 'videos' ? 'active' : ''}`}
            >
              Videos
            </button>
          </div>

          {/* Date Filter */}
          <div className="gallery-toggle-group">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`gallery-toggle ${showFilters ? 'active' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Date Filters */}
        {showFilters && (
          <div className="mt-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-6 justify-center flex-wrap">
              <div className="gallery-date-filter">
                <label className="text-sm font-medium text-gray-700 mb-2 block">From:</label>
                <input
                  type="date"
                  value={dateFilter.start || ''}
                  onChange={(e) => {
                    setDateFilter(prev => ({ ...prev, start: e.target.value }));
                    // Clear results only, don't auto-search
                    setResults([]);
                    setCursor(undefined);
                    setPage(1);
                    setTotalResults(0);
                    setHasMore(false);
                  }}
                  className="gallery-date-input"
                />
              </div>
              <div className="gallery-date-filter">
                <label className="text-sm font-medium text-gray-700 mb-2 block">To:</label>
                <input
                  type="date"
                  value={dateFilter.end || ''}
                  onChange={(e) => {
                    setDateFilter(prev => ({ ...prev, end: e.target.value }));
                    // Clear results only, don't auto-search
                    setResults([]);
                    setCursor(undefined);
                    setPage(1);
                    setTotalResults(0);
                    setHasMore(false);
                  }}
                  className="gallery-date-input"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDateFilter({});
                  // Clear results only, don't auto-search
                  setResults([]);
                  setCursor(undefined);
                  setPage(1);
                  setTotalResults(0);
                  setHasMore(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Clear Dates
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Results Count */}
      {totalResults > 0 && (
        <div className="gallery-results-count">
          {totalResults.toLocaleString()} {totalResults === 1 ? 'item' : 'items'} found
          {query && ` for "${query}"`}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 m-4 text-center">
          {error}
        </div>
      )}

      {/* Gallery Grid */}
      {results.length > 0 && (
        <div className="gallery-container">
          <div className="gallery-grid">
            {results.map((result, index) => (
              <div
                key={result.id}
                className="gallery-item"
                onClick={() => openPreview(result, index)}
                data-video-id={result.id}
              >
                {/* Media */}
                <div className="gallery-media">
                  {isVideoFile(result.file_name || '') ? (
                    <VideoThumbnail
                      thumbnailUrl={result.thumbnail_url}
                      fileName={result.file_name || 'Video'}
                      className="w-full h-full"
                    />
                  ) : (
                    <ResponsiveThumbnail
                      thumbnailUrl={result.thumbnail_url}
                      fileName={result.file_name || 'Image'}
                      className="w-full h-full"
                      quality="high"
                    />
                  )}
                </div>

                {/* Always Visible Bottom Info */}
                <div className="gallery-bottom-info">
                  <div className="gallery-filename">
                    {result.file_name || 'Untitled'}
                  </div>
                  <div className="gallery-basic-info">
                    {result.modified_date ? formatDate(result.modified_date) : 
                     result.processed_date ? formatDate(result.processed_date) : 
                     result.metadata?.modified_time ? formatDate(result.metadata.modified_time) :
                     result.metadata?.created_time ? formatDate(result.metadata.created_time) :
                     'No date available'}
                    {result.similarity_percentage && (
                      <span style={{marginLeft: '8px', color: '#ffc083'}}> • {result.similarity_percentage}%</span>
                    )}
                  </div>
                </div>

                {/* Top Badges */}
                <div className="gallery-badges">
                  {/* Relevance Badge */}
                  {result.similarity_percentage && (
                    <div className="gallery-relevance-badge">
                      {result.similarity_percentage}%
                    </div>
                  )}
                </div>

                {/* Hover Info Panel */}
                <div className="gallery-info">
                  <div className="gallery-info-top">
                    <h3>{result.file_name || 'Untitled'}</h3>
                    <div className="gallery-info-row">
                      <span>Size:</span>
                      <span>{formatFileSize(result.file_size)}</span>
                    </div>
                    <div className="gallery-info-row">
                      <span>Type:</span>
                      <span>{getFileType(result.file_name || '')}</span>
                    </div>
                    {result.modified_date && (
                      <div className="gallery-info-row">
                        <span>Modified:</span>
                        <span>{formatDate(result.modified_date)}</span>
                      </div>
                    )}
                    {result.similarity_percentage && (
                      <div className="gallery-info-row">
                        <span>Match:</span>
                        <span>{result.similarity_percentage}%</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="gallery-info-bottom">
                      <div className="gallery-tags">
                        {result.tags.slice(0, 5).map((tag, idx) => (
                          <span key={idx} className="gallery-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="gallery-load-more"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5 mr-2 inline" />
                  Loading more...
                </>
              ) : (
                'Load More'
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && query && results.length === 0 && (
        <div className="gallery-empty">
          <ImageIcon className="gallery-empty-icon" />
          <h3>No results found</h3>
          <p>Try a different search term or adjust your filters</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
          {/* Modal Content */}
          <div className="glass-modal relative w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/20">
              <h3 className="text-xl font-semibold text-gray-900 truncate pr-4">
                {previewResult.file_name || 'Untitled'}
              </h3>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
              {/* Media Preview */}
              <div className="flex-1 bg-black/5 flex items-center justify-center p-8">
                {isVideoFile(previewResult.file_name || '') ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={previewResult.download_url}
                      className="max-w-full max-h-full rounded-lg"
                      muted={isMuted}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onTimeUpdate={() => {
                        if (videoRef.current && !isDragging) {
                          setCurrentTime(videoRef.current.currentTime);
                        }
                      }}
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          setDuration(videoRef.current.duration);
                        }
                      }}
                      onProgress={() => {
                        if (videoRef.current && videoRef.current.buffered.length > 0) {
                          const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
                          setBuffered((bufferedEnd / videoRef.current.duration) * 100);
                        }
                      }}
                    />
                    {/* Video Controls */}
                    <div className="absolute bottom-4 left-4 right-4">
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div 
                          ref={progressRef}
                          className="relative h-2 bg-black bg-opacity-40 rounded-full cursor-pointer group hover:h-3 transition-all duration-200"
                          onClick={handleProgressClick}
                          onMouseDown={handleProgressMouseDown}
                        >
                          {/* Buffered Progress */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-gray-300 bg-opacity-60 rounded-full"
                            style={{ width: `${buffered}%` }}
                          />
                          
                          {/* Current Progress */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-white rounded-full shadow-sm"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                          />
                          
                          {/* Progress Handle */}
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-200 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200"
                            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                          />
                        </div>
                        
                        {/* Time Display */}
                        {duration > 0 && (
                          <div className="flex justify-between text-xs text-white mt-2 opacity-90">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Control Buttons */}
                      <div className="flex items-center justify-center space-x-4">
                        <button
                          onClick={togglePlayPause}
                          className="p-3 bg-black bg-opacity-70 text-white rounded-full hover:bg-opacity-80 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={toggleMute}
                          className="p-3 bg-black bg-opacity-70 text-white rounded-full hover:bg-opacity-80 transition-colors"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={previewResult.download_url || previewResult.thumbnail_url}
                    alt={previewResult.file_name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                )}
              </div>

              {/* Details Panel */}
              <div className="w-full lg:w-96 p-6 border-l border-gray-200/20 overflow-y-auto bg-white">
                {/* File Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">File Size</p>
                    <p className="font-medium">{formatFileSize(previewResult.file_size)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">File Type</p>
                    <p className="font-medium">{getFileType(previewResult.file_name || '')}</p>
                  </div>

                  {previewResult.modified_date && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Modified</p>
                      <p className="font-medium">{formatDate(previewResult.modified_date)}</p>
                    </div>
                  )}

                  {/* Match Score */}
                  {previewResult.similarity_percentage && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Match Score</p>
                      <div className="inline-block bg-[var(--beforest-warm-yellow)] text-[var(--beforest-dark-earth)] px-3 py-1 rounded-full text-sm font-semibold">
                        {previewResult.similarity_percentage}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {previewResult.tags && previewResult.tags.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {previewResult.tags.map((tag, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  {previewResult.download_url && (
                    <a
                      href={previewResult.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center space-x-2 bg-[var(--beforest-forest-green)] text-white px-4 py-3 rounded-lg hover:bg-[var(--beforest-olive-green)] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                  )}
                  
                  <button
                    onClick={() => copyToClipboard(previewResult.dropbox_path)}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Path</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none">
              <button
                onClick={() => navigatePreview('prev')}
                className="p-3 bg-black bg-opacity-70 text-white rounded-full hover:bg-opacity-80 transition-colors pointer-events-auto"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigatePreview('next')}
                className="p-3 bg-black bg-opacity-70 text-white rounded-full hover:bg-opacity-80 transition-colors pointer-events-auto"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}