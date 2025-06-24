import React, { useState, useEffect } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';
import { FileType } from '../services/api';
import { dropboxService } from '../services/api';
import { Play, Download } from 'lucide-react';
// import GallerySelectionPanel from './gallery/GallerySelectionPanel'; // Replaced with custom inline component
import GalleryCreateModal from './gallery/GalleryCreateModal';
import { createGallery } from '../services/galleryApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import type { DropboxFile } from '../types';
import { isGalleryEnabled } from '../utils/config';

interface SearchResultsProps {
  results: DropboxFile[];
  loading: boolean;
  searchTerm: string;
  appliedFilters: {
    fileType: string;
    dateRange: string;
    customDateRange: { start: string; end: string } | null;
  };
  searchDuration: number;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  results, 
  loading, 
  searchTerm, 
  appliedFilters,
  searchDuration 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const galleryEnabled = isGalleryEnabled();
  
  // Gallery selection state - only used if gallery features are enabled
  const [selectedImages, setSelectedImages] = useState<DropboxFile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingGallery, setIsCreatingGallery] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [loadingVideo, setLoadingVideo] = useState<Record<string, boolean>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<Record<string, string>>({});
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; path: string } | null>(null);

  // Cache for video URLs to avoid unnecessary API calls
  const [videoUrlCache, setVideoUrlCache] = useState<Record<string, { url: string; timestamp: number }>>({});
  const VIDEO_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  const getVideoUrl = async (file: DropboxFile): Promise<string> => {
    const now = Date.now();
    const cached = videoUrlCache[file.path_display];
    // Check cache first
    if (cached && (now - cached.timestamp) < VIDEO_CACHE_DURATION) {
      console.log('Using cached video URL');
      return cached.url;
    }
    // Try to get a direct download link first
    let url: string | null = null;
    try {
      url = await dropboxService.getDownloadLink(file.path_display);      // Convert to direct link if needed
      if (url.includes('www.dropbox.com')) {
        // Use public Dropbox link conversion (replace ?dl=0 with ?raw=1)
        url = url.replace('?dl=0', '?raw=1');
      }
    } catch (err) {
      console.warn('Failed to get direct download link, will try temporary link:', err);
    }
    // If direct link fails, fallback to temporary link
    if (!url) {
      try {
        url = await dropboxService.getVideoLink(file.path_display);
      } catch (err) {
        console.error('Failed to get video link:', err);
        throw new Error('Could not get a playable video link.');
      }
    }
    // Optionally use CORS proxy if needed for development (uncomment if required)
    // url = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    // Update cache
    setVideoUrlCache(prev => ({
      ...prev,
      [file.path_display]: { url, timestamp: now }
    }));
    return url;
  };

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(playingVideos).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [playingVideos]);

  // Cleanup selected video when changing
  useEffect(() => {
    return () => {
      if (selectedVideo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(selectedVideo.url);
      }
    };
  }, [selectedVideo]);

  const handleImageClick = (file: DropboxFile) => {
    if (file.path_display) {
      setSelectedImage(file.path_display);
      setSelectedFileName(file.name);
      setIsPreviewOpen(true);
    }
  };

  const handleVideoClick = async (file: DropboxFile) => {
    // If this video is already selected, close it
    if (selectedVideo?.path === file.path_display) {
      setSelectedVideo(null);
      return;
    }
    setLoadingVideo(prev => ({ ...prev, [file.path_display]: true }));
    try {
      const videoUrl = await getVideoUrl(file);
      console.log('Got video URL:', videoUrl);
      if (!videoUrl) {
        throw new Error('Failed to get video URL');
      }
      setSelectedVideo({ url: videoUrl, path: file.path_display });
    } catch (error) {
      console.error('Error getting video URL:', error);
      alert('Failed to load video. Please try again.');
      setSelectedVideo(null);
    } finally {
      setLoadingVideo(prev => ({ ...prev, [file.path_display]: false }));
    }
  }

  const handleClosePreview = () => {
    setSelectedImage(null);
    setSelectedFileName('');
    setIsPreviewOpen(false);
    setSelectedVideo(null);
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      const downloadLink = await dropboxService.getDownloadLink(path);
      const a = document.createElement('a');
      a.href = downloadLink;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleCreateGallery = async (title: string, summary: string) => {
    if (!galleryEnabled) return;
    
    if (!user) {
      alert('You must be logged in to create a gallery.');
      return;
    }

    if (selectedImages.length === 0) {
      alert('Please select at least one image to create a gallery.');
      return;
    }

    setIsCreatingGallery(true);
    try {
      const mediaUrls = selectedImages.map(img => img.path_display);
      const mediaTypes = selectedImages.map(img => 
        img.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? 'image' : 'video'
      );

      const { error } = await createGallery({
        title,
        summary,
        media_paths: mediaUrls,
        media_types: mediaTypes,
        user_id: user.username,
        thumbnail_path: mediaUrls[0] // Use first image as thumbnail
      });

      if (error) {
        console.error('Supabase error:', error);
        alert('Failed to create gallery: ' + error.message);
        return;
      }

      setSelectedImages([]);
      setShowCreateModal(false);
      navigate('/gallery');
    } catch (err) {
      console.error('Error creating gallery:', err);
      alert('An unexpected error occurred while creating the gallery.');
    } finally {
      setIsCreatingGallery(false);
    }
  };

  const toggleImageSelection = (file: DropboxFile) => {
    if (!galleryEnabled) return;
    
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.path_display === file.path_display);
      if (isSelected) {
        return prev.filter(img => img.path_display !== file.path_display);
      } else {
        return [...prev, file];
      }
    });
  };

  const removeFromSelection = (pathDisplay: string) => {
    if (!galleryEnabled) return;
    
    setSelectedImages(prev => prev.filter(img => img.path_display !== pathDisplay));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (results.length === 0 && searchTerm) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any files matching "{searchTerm}"
            {appliedFilters.fileType !== 'all' && ` with file type "${appliedFilters.fileType}"`}
            {appliedFilters.dateRange !== 'all' && ` in the selected date range`}.
          </p>
          <p className="text-sm text-gray-500">
            Try adjusting your search terms or filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Statistics */}
      {/* ... existing statistics code ... */}

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {results.map((file, index) => {
          const isSelected = galleryEnabled ? selectedImages.some(img => img.path_display === file.path_display) : false;
          const isImage = file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
          const isVideo = file.name.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i);

          return (
            <div key={`${file.path_display}-${index}`} className="group relative">
              <div className={`relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border-2 ${
                isSelected ? 'border-brand-forest ring-2 ring-brand-forest/30' : 'border-transparent hover:border-gray-200'
              }`}>
                
                {/* Selection Checkbox - only show if gallery features are enabled */}
                {galleryEnabled && (
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={() => toggleImageSelection(file)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-brand-forest border-brand-forest text-white'
                          : 'bg-white/90 border-gray-300 hover:border-brand-forest hover:bg-white'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                {/* File Type Badge */}
                <div className="absolute top-3 right-3 z-20">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${
                    isVideo 
                      ? 'bg-red-500/90 text-white' 
                      : 'bg-blue-500/90 text-white'
                  }`}>
                    {isVideo ? 'VIDEO' : 'IMAGE'}
                  </span>
                </div>

                {/* Media Container */}
                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {file.path_display ? (
                    <div 
                      className="w-full h-full relative cursor-pointer"
                      onClick={() => isVideo ? handleVideoClick(file) : handleImageClick(file)}
                    >
                      {isVideo && playingVideos[file.path_display] ? (
                        <div className="video-container" onClick={(e) => e.stopPropagation()}>
                          <video
                            src={playingVideos[file.path_display]}
                            controls
                            autoPlay
                            preload="auto"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const videoElement = e.target as HTMLVideoElement;
                              console.error('Video playback error details:', {
                                error: videoElement.error,
                                networkState: videoElement.networkState,
                                readyState: videoElement.readyState,
                                currentSrc: videoElement.currentSrc
                              });
                              console.error('Video playback error:', e);
                              alert('Error playing video. Please try again.');
                              setPlayingVideos(prev => {
                                const next = { ...prev };
                                delete next[file.path_display];
                                return next;
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <img
                            src={file.path_display}
                            alt={file.name}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                            onError={(e) => {
                              console.error('Error loading thumbnail:', file.path_display);
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = '';
                              target.style.display = 'none';
                            }}
                          />
                          {loadingVideo[file.path_display] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                              <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent"></div>
                            </div>
                          )}
                          {isVideo && !loadingVideo[file.path_display] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                              <div className="w-14 h-14 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                                <Play className="w-6 h-6 text-brand-forest ml-1" />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Enhanced Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white text-sm font-medium truncate drop-shadow-md">{file.name}</p>
                          <p className="text-white/80 text-xs mt-1">
                            {dropboxService.formatFileSize(file.size)} • {new Date(file.server_modified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium">No preview</p>
                        <p className="text-xs text-gray-400 mt-1">File not supported</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced File Info */}
                <div className="p-4 bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight flex-1 mr-2 line-clamp-2" title={file.name}>
                      {file.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file.path_display, file.name);
                      }}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-brand-forest hover:bg-brand-forest/10 rounded-lg transition-all duration-200 group/download"
                      title="Download file"
                    >
                      <Download size={16} className="group-hover/download:scale-110 transition-transform duration-200" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-brand-forest bg-brand-forest/10 px-2 py-1 rounded-full">
                      {dropboxService.formatFileSize(file.size)}
                    </span>
                    <span className="text-gray-500">
                      {new Date(file.server_modified).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Gallery Selection Panel - only show if gallery features are enabled and items are selected */}
      {galleryEnabled && selectedImages.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {selectedImages.length} Selected
            </h3>
            <button
              onClick={() => setSelectedImages([])}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3 mb-4 max-h-32 overflow-y-auto">
            {selectedImages.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                <button
                  onClick={() => removeFromSelection(file.path_display)}
                  className="ml-2 text-gray-400 hover:text-red-500 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={isCreatingGallery}
            className="w-full bg-brand-forest hover:bg-brand-olive text-white py-3 px-4 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreatingGallery ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Gallery'
            )}
          </button>
        </div>
      )}

      {/* Gallery Create Modal - only show if gallery features are enabled */}
      {galleryEnabled && (
        <GalleryCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGallery}
        />
      )}

      {selectedImage && (
        <ImagePreviewModal
          imageUrl={selectedImage}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          fileName={selectedFileName}
          isVideo={selectedFileName.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i) !== null}
        />
      )}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="relative w-full max-w-5xl animate-in zoom-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
              <video
                key={selectedVideo.url}
                src={selectedVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full"
                onLoadStart={(e) => {
                  console.log('Video load started');
                  const video = e.target as HTMLVideoElement;
                  video.volume = 1.0;
                }}
                onCanPlay={() => console.log('Video can play')}
                onError={(e) => {
                  const video = e.target as HTMLVideoElement;
                  console.error('Video playback error:', {
                    error: video.error?.message,
                    code: video.error?.code,
                    networkState: video.networkState,
                    readyState: video.readyState,
                    currentSrc: video.currentSrc,
                    paused: video.paused,
                    ended: video.ended,
                    seeking: video.seeking,
                    duration: video.duration,
                    volume: video.volume,
                    muted: video.muted
                  });
                  alert('Error playing video. Please try again.');
                  setSelectedVideo(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
