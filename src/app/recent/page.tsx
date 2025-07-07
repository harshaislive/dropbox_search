'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Loader2, Calendar, Copy, Check, ExternalLink, Home } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  dropbox_path: string;
  file_name?: string;
  caption?: string;
  tags?: string[];
  similarity: number;
  public_url?: string;
  thumbnail_url?: string;
  download_url?: string;
  file_type?: string;
  file_size?: number;
  source: string;
  enhanced: boolean;
  metadata?: Record<string, any>;
  modified_date?: string;
  processed_date?: string;
  file_extension?: string;
}

interface RecentImagesResponse {
  results: SearchResult[];
  totalFound: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  processingTime: number;
  error?: string;
}

export default function RecentImages() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Preview modal states
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const resultsPerPage = 50;

  const fetchRecentImages = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recent?page=${page}&limit=${resultsPerPage}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent images');
      }

      const data: RecentImagesResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalFound(data.totalFound);
      setHasMore(data.hasMore);

      console.log(`📸 Loaded ${data.results.length} recent images (page ${data.currentPage}/${data.totalPages})`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching recent images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentImages(1);
  }, []);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchRecentImages(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const openPreview = (result: SearchResult, index: number) => {
    setPreviewResult(result);
    setPreviewIndex(index);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewResult(null);
    setPreviewIndex(-1);
  };

  const navigatePreview = (direction: 'prev' | 'next') => {
    if (!results.length) return;
    
    let newIndex = direction === 'prev' ? previewIndex - 1 : previewIndex + 1;
    
    if (newIndex < 0) newIndex = results.length - 1;
    if (newIndex >= results.length) newIndex = 0;
    
    setPreviewIndex(newIndex);
    setPreviewResult(results[newIndex]);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Keyboard navigation for preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPreview) return;
      
      if (e.key === 'Escape') {
        closePreview();
      } else if (e.key === 'ArrowLeft') {
        navigatePreview('prev');
      } else if (e.key === 'ArrowRight') {
        navigatePreview('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreview, previewIndex]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page and ellipsis
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="px-3 py-2">...</span>);
      }
    }

    // Main page buttons
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 rounded-lg border transition-colors ${
            i === currentPage
              ? 'beforest-btn-primary text-white'
              : 'hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page and ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="px-3 py-2">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {pages}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen beforest-gradient-bg">
      {/* Header */}
      <header className="beforest-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <img 
                  src="/23-Beforest-Black-with-Tagline.png" 
                  alt="Beforest" 
                  className="h-6 md:h-8 w-auto cursor-pointer"
                />
              </Link>
              <div className="hidden md:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">Recent Images</h1>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-3">
              <Link 
                href="/"
                className="beforest-btn-secondary px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center space-x-1 md:space-x-2 text-sm md:text-base"
              >
                <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Search</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 py-4 md:px-4 md:py-8">
        {/* Header Info */}
        <div className="text-center mb-6 md:mb-8 beforest-fade-in">
          <div className="beforest-search-hero rounded-2xl md:rounded-3xl p-6 md:p-8 mb-4 text-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-4xl lg:text-5xl mb-2 md:mb-3 font-bold text-white" style={{ letterSpacing: '-0.025em', lineHeight: '1.2' }}>
                Recent
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                  Brand Assets
                </span>
              </h2>
              <p className="text-sm md:text-lg lg:text-xl mb-2 text-blue-100">
                Browse the latest additions to your visual library
              </p>
              {!loading && (
                <p className="text-xs md:text-sm text-blue-200">
                  {totalFound} images • Page {currentPage} of {totalPages}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin w-8 h-8 mb-4 mx-auto text-blue-600" />
              <p className="text-gray-600">Loading recent images...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-800">Error: {error}</p>
              <button
                onClick={() => fetchRecentImages(currentPage)}
                className="mt-4 beforest-btn-primary px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200 cursor-pointer"
                  onClick={() => openPreview(result, index)}
                >
                  <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-100">
                    {result.thumbnail_url ? (
                      <img
                        src={result.thumbnail_url}
                        alt={result.file_name || 'Image'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 truncate mb-1">
                      {result.file_name || 'Untitled'}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(result.modified_date || result.processed_date)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(result.file_size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {renderPagination()}
          </>
        )}

        {/* No Results */}
        {!loading && !error && results.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No recent images found</p>
              <Link
                href="/"
                className="beforest-btn-primary px-4 py-2 rounded-lg inline-flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go to Search</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewResult && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation Arrows */}
            {results.length > 1 && (
              <>
                <button
                  onClick={() => navigatePreview('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigatePreview('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image */}
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {previewResult.thumbnail_url ? (
                  <img
                    src={previewResult.thumbnail_url}
                    alt={previewResult.file_name || 'Image'}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>

              {/* Image Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {previewResult.file_name || 'Untitled'}
                    </h3>
                    {previewResult.caption && (
                      <p className="text-gray-600 mb-3">{previewResult.caption}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">File Size:</span>
                    <span className="ml-2 text-gray-600">{formatFileSize(previewResult.file_size)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Modified:</span>
                    <span className="ml-2 text-gray-600">{formatDate(previewResult.modified_date || previewResult.processed_date)}</span>
                  </div>
                </div>

                {/* Tags */}
                {previewResult.tags && previewResult.tags.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-700 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {previewResult.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-gray-200">
                  {previewResult.download_url && (
                    <a
                      href={previewResult.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="beforest-btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                  )}
                  
                  <button
                    onClick={() => copyToClipboard(previewResult.dropbox_path)}
                    className="beforest-btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Path'}</span>
                  </button>
                </div>

                {/* Navigation Info */}
                {results.length > 1 && (
                  <div className="text-center mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Image {previewIndex + 1} of {results.length} • 
                      Use arrow keys or buttons to navigate
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 