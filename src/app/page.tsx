'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Download, Loader2, Calendar, X, ChevronLeft, ChevronRight, Copy, Check, Play, Pause, Volume2, VolumeX, Filter, ImageIcon, Folder, HelpCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  const [showHelp, setShowHelp] = useState(false);
  const [searchId, setSearchId] = useState(0); // Track search iterations
  
  // Sorting and all results state
  const [allResults, setAllResults] = useState<SearchResult[]>([]); // All fetched results
  const [isLoadingAllResults, setIsLoadingAllResults] = useState(false);
  const [allResultsLoaded, setAllResultsLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Lazy loading for thumbnails
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set());
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, { thumbnail_url?: string; download_url?: string }>>(new Map());
  
  const resultsPerPage = 50;

  // Function to load thumbnails in batch
  const loadThumbnailsBatch = useCallback(async (paths: string[]) => {
    // Filter out paths that are already loading or cached
    const pathsToLoad = paths.filter(path => 
      !loadingThumbnails.has(path) && !thumbnailCache.has(path)
    );

    if (pathsToLoad.length === 0) return;

    // Mark all paths as loading
    setLoadingThumbnails(prev => {
      const newSet = new Set(prev);
      pathsToLoad.forEach(path => newSet.add(path));
      return newSet;
    });

    try {
      const response = await fetch('/api/thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: pathsToLoad }),
      });

      if (response.ok) {
        const data = await response.json();
        const { thumbnails } = data;

        // Update thumbnail cache
        setThumbnailCache(prev => {
          const newCache = new Map(prev);
          Object.entries(thumbnails).forEach(([path, urls]: [string, any]) => {
            if (urls.thumbnail_url || urls.download_url) {
              newCache.set(path, {
                thumbnail_url: urls.thumbnail_url,
                download_url: urls.download_url
              });
            }
          });
          return newCache;
        });
      }
    } catch (error) {
      console.error('Error loading thumbnails:', error);
    } finally {
      setLoadingThumbnails(prev => {
        const newSet = new Set(prev);
        pathsToLoad.forEach(path => newSet.delete(path));
        return newSet;
      });
    }
  }, [loadingThumbnails, thumbnailCache]);

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
    
    // For new searches, ensure results are cleared immediately
    if (pageNum === 1 && !append) {
      setResults([]);
    }
    
    // Stop any playing video when searching
    setActiveVideoId(null);
    setIsPlaying(false);

    try {
      // For new searches (page 1, not appending), always clear cursor and ensure fresh start
      if (pageNum === 1 && !append) {
        setCursor(undefined);
        console.log(`[SEARCH #${searchId}] New search - cursor cleared, fresh start`);
      }

      let apiEndpoint: string;
      let requestBody: any = {};

      // Always use Dropbox file search
      apiEndpoint = '/api/search/dropbox';
      requestBody = {
        query: searchQuery,
        max_results: resultsPerPage,
        cursor: (pageNum === 1 && !append) ? undefined : (useCursor || cursor), // Never send cursor for new searches
        search_type: mediaType === 'videos' ? 'video' : 'media',
        date_filter: dateFilter // Add date filter
      };
      
      console.log(`[SEARCH #${searchId}] Using Dropbox file search API:`, apiEndpoint);
      
      console.log(`[SEARCH #${searchId}] Using endpoint: ${apiEndpoint}`, requestBody);
      console.log(`[SEARCH #${searchId}] Cursor values - useCursor: ${useCursor}, current cursor state: ${cursor}`);

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

  // Function to fetch all remaining pages for sorting (OPTIMIZED)
  const fetchAllResults = async (searchQuery: string, initialResults: SearchResult[], initialCursor?: string) => {
    console.log(`[FETCH_ALL] Starting OPTIMIZED fetch for: "${searchQuery}"`);
    setIsLoadingAllResults(true);
    
    let allFetchedResults = [...initialResults];
    let currentCursor = initialCursor;
    
    try {
      // OPTIMIZATION 1: Parallel batch fetching (fetch 3 pages at once)
      const BATCH_SIZE = 3;
      const pendingRequests: Promise<any>[] = [];
      
      while (currentCursor) {
        // Create batch of parallel requests
        const batchCursors = [currentCursor];
        let tempCursor = currentCursor;
        
        // Build batch of cursors (we'll get more cursors as responses come in)
        for (let i = 0; i < BATCH_SIZE && tempCursor; i++) {
          const response = await fetch('/api/search/dropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: searchQuery,
              max_results: resultsPerPage,
              cursor: tempCursor,
              search_type: mediaType === 'videos' ? 'video' : 'media',
              date_filter: dateFilter,
              metadata_only: true // OPTIMIZATION 2: Skip URL generation for background fetching
            }),
          });

          if (!response.ok) break;
          
          const data: any = await response.json();
          
          // Process results quickly (no URL generation)
          let newResults = data.files.map((file: any) => ({
            ...file,
            similarity_percentage: file.similarity_percentage || 85,
            source: 'dropbox' as const,
            enhanced: false, // Mark as not enhanced for lazy loading
            thumbnail_url: undefined, // Will be loaded on demand
            download_url: undefined
          }));

          // Apply media type filter
          if (mediaType !== 'all') {
            newResults = newResults.filter((result: SearchResult) => {
              const fileType = getFileType(result.file_name || '');
              return mediaType === 'videos' ? fileType === 'video' : fileType === 'image';
            });
          }
          
          allFetchedResults = [...allFetchedResults, ...newResults];
          tempCursor = data.has_more ? data.cursor : undefined;
          
          console.log(`[FETCH_ALL] Batch item ${i + 1}: +${newResults.length} results, total: ${allFetchedResults.length}`);
          
          // OPTIMIZATION 3: Progressive updates - update UI every batch
          if (i % 2 === 0) {
            setAllResults([...allFetchedResults]);
          }
        }
        
        currentCursor = tempCursor;
      }
      
      console.log(`[FETCH_ALL] OPTIMIZED fetch completed! Total results: ${allFetchedResults.length}`);
      setAllResults(allFetchedResults);
      setAllResultsLoaded(true);
      
    } catch (error) {
      console.error('[FETCH_ALL] Error fetching all results:', error);
    } finally {
      setIsLoadingAllResults(false);
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

    setResults(append ? (prev => [...prev, ...filteredResults]) : filteredResults);
    setHasMore(data.hasMore);
    setTotalResults(data.totalFound);
    setPage(pageNum);
    
    // Always set cursor from response, or clear it if not provided
    if (data.cursor) {
      console.log(`[RESPONSE] Setting new cursor: ${data.cursor}`);
      setCursor(data.cursor);
    } else {
      console.log(`[RESPONSE] No cursor in response, clearing cursor`);
      setCursor(undefined); // Clear cursor instead of keeping old one
    }

    // For first page of new search, start fetching all results in background
    if (pageNum === 1 && !append && data.hasMore && data.cursor) {
      console.log(`[RESPONSE] First page loaded, starting background fetch for all results`);
      fetchAllResults(query, filteredResults, data.cursor);
    } else if (pageNum === 1 && !append && !data.hasMore) {
      // If first page is also the last page, we already have all results
      console.log(`[RESPONSE] Single page result, marking all results as loaded`);
      setAllResults(filteredResults);
      setAllResultsLoaded(true);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Increment search ID to track this search iteration
    const newSearchId = searchId + 1;
    setSearchId(newSearchId);
    
    // Clear ALL previous state immediately and aggressively
    setResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCursor(undefined);
    setPage(1);
    setError(null);
    
    // Reset sorting state
    setAllResults([]);
    setAllResultsLoaded(false);
    setIsLoadingAllResults(false);
    setSortBy(null);
    
    // Clear thumbnail cache for new search
    setThumbnailCache(new Map());
    setLoadingThumbnails(new Set());
    
    setActiveVideoId(null);
    setIsPlaying(false);
    
    console.log(`[SEARCH #${newSearchId}] Starting fresh search with query: "${query}"`);
    
    searchImages(query, 1, false);
  };

  // Apply sorting to all cached results and re-paginate
  const applySorting = (sortType: 'date' | 'name' | 'size', order: 'asc' | 'desc') => {
    if (allResults.length === 0) {
      console.log('[SORT] Cannot sort - no results available');
      return;
    }

    const sortLabel = allResultsLoaded ? 'complete' : 'partial';
    console.log(`[SORT] Applying ${sortType} ${order} sort to ${allResults.length} ${sortLabel} results`);
    
    const sortedResults = [...allResults].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortType) {
        case 'date':
          aValue = new Date(a.modified_date || a.processed_date || 0);
          bValue = new Date(b.modified_date || b.processed_date || 0);
          break;
        case 'name':
          aValue = (a.file_name || '').toLowerCase();
          bValue = (b.file_name || '').toLowerCase();
          break;
        case 'size':
          aValue = a.file_size || 0;
          bValue = b.file_size || 0;
          break;
        default:
          return 0;
      }
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Update all results with sorted version
    setAllResults(sortedResults);
    
    // Reset to first page with sorted results
    const firstPageResults = sortedResults.slice(0, resultsPerPage);
    setResults(firstPageResults);
    setPage(1);
    setHasMore(sortedResults.length > resultsPerPage || !allResultsLoaded);
    setCursor(undefined); // Clear cursor since we're using local pagination
    
    console.log(`[SORT] Applied ${sortType} ${order}, showing first ${firstPageResults.length} of ${sortedResults.length} ${sortLabel} results`);
  };

  // Handle sort option change
  const handleSort = (sortType: 'date' | 'name' | 'size') => {
    const newOrder = sortBy === sortType && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(sortType);
    setSortOrder(newOrder);
    
    // OPTIMIZATION: Early sorting - sort with current results while loading more
    if (allResults.length > 0 && !allResultsLoaded) {
      console.log(`[EARLY_SORT] Sorting ${allResults.length} partial results while loading more...`);
      applySorting(sortType, newOrder);
    } else {
      applySorting(sortType, newOrder);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      // If we have all results loaded and are sorting, use local pagination
      if (allResultsLoaded && sortBy) {
        const nextPage = page + 1;
        const startIndex = (nextPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const nextPageResults = allResults.slice(startIndex, endIndex);
        
        if (nextPageResults.length > 0) {
          setResults([...results, ...nextPageResults]);
          setPage(nextPage);
          setHasMore(endIndex < allResults.length);
          console.log(`[LOAD_MORE] Local pagination: loaded page ${nextPage}, ${nextPageResults.length} results`);
        }
      } else {
        // Use normal API pagination
        console.log(`[LOAD_MORE] API pagination: Current cursor: ${cursor}, page: ${page}`);
        searchImages(query, page + 1, true, cursor);
      }
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

  // Load thumbnails for visible results that don't have them
  useEffect(() => {
    const pathsNeedingThumbnails = results
      .filter(result => !result.thumbnail_url && !result.enhanced)
      .map(result => result.dropbox_path);
    
    if (pathsNeedingThumbnails.length > 0) {
      console.log(`[LAZY_LOAD] Loading ${pathsNeedingThumbnails.length} thumbnails`);
      loadThumbnailsBatch(pathsNeedingThumbnails);
    }
  }, [results, loadThumbnailsBatch]);

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

          {/* Sort Controls - Show when we have partial results or all results */}
          {allResults.length > 0 && (
            <div className="gallery-toggle-group">
              <button
                type="button"
                onClick={() => handleSort('date')}
                className={`gallery-toggle ${sortBy === 'date' ? 'active' : ''}`}
                title={`Sort by date ${sortBy === 'date' && sortOrder === 'desc' ? '(newest first)' : '(oldest first)'}`}
              >
                <Calendar className="w-4 h-4" />
                Date
                {sortBy === 'date' && (
                  sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 ml-1" /> : <ArrowUp className="w-3 h-3 ml-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSort('name')}
                className={`gallery-toggle ${sortBy === 'name' ? 'active' : ''}`}
                title={`Sort by name ${sortBy === 'name' && sortOrder === 'desc' ? '(Z-A)' : '(A-Z)'}`}
              >
                <Folder className="w-4 h-4" />
                Name
                {sortBy === 'name' && (
                  sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 ml-1" /> : <ArrowUp className="w-3 h-3 ml-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSort('size')}
                className={`gallery-toggle ${sortBy === 'size' ? 'active' : ''}`}
                title={`Sort by size ${sortBy === 'size' && sortOrder === 'desc' ? '(largest first)' : '(smallest first)'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
                Size
                {sortBy === 'size' && (
                  sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 ml-1" /> : <ArrowUp className="w-3 h-3 ml-1" />
                )}
              </button>
            </div>
          )}

          {/* Loading indicator for fetching all results */}
          {isLoadingAllResults && (
            <div className="gallery-toggle-group">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading all results for sorting...
              </div>
            </div>
          )}
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
                key={`${result.dropbox_path || result.id}-${index}`}
                className="gallery-item"
                onClick={() => openPreview(result, index)}
                data-video-id={result.id}
              >
                {/* Media */}
                <div className="gallery-media">
                  {isVideoFile(result.file_name || '') ? (
                    <VideoThumbnail
                      thumbnailUrl={thumbnailCache.get(result.dropbox_path)?.thumbnail_url || result.thumbnail_url}
                      fileName={result.file_name || 'Video'}
                      className="w-full h-full"
                    />
                  ) : (
                    <ResponsiveThumbnail
                      thumbnailUrl={thumbnailCache.get(result.dropbox_path)?.thumbnail_url || result.thumbnail_url}
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

      {/* Help Button - Bottom Left */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 left-6 z-40 bg-[var(--beforest-forest-green)] text-white p-3 rounded-full shadow-lg hover:bg-[var(--beforest-olive-green)] transition-colors duration-200 hover:scale-105"
        title="How to use"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[var(--beforest-forest-green)]" />
                How to Search
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Instructions */}
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900 mb-1">🔍 Search by content:</p>
                <p className="text-gray-600">Type what you see in images: &quot;dog playing&quot;, &quot;sunset beach&quot;, &quot;birthday party&quot;</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-900 mb-1">📁 Search by filename:</p>
                <p className="text-gray-600">Use file names or parts: &quot;vacation&quot;, &quot;IMG_2023&quot;, &quot;wedding photos&quot;</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-900 mb-1">🎯 Use filters:</p>
                <p className="text-gray-600">Filter by Photos/Videos, date ranges, or use the Filters button for more options</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-6 px-4 py-2 bg-[var(--beforest-forest-green)] text-white rounded-lg hover:bg-[var(--beforest-olive-green)] transition-colors font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}