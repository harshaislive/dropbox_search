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

interface SearchResultsProps {
  results: FileType[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  const safeResults = Array.isArray(results) ? results : [];
  // Gallery selection state
  const [selectedFiles, setSelectedFiles] = useState<FileType[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Helper: add or remove file from selection
  const toggleSelectFile = (file: FileType) => {
    setSelectedFiles((prev) => {
      if (prev.some(f => f.path === file.path)) {
        return prev.filter(f => f.path !== file.path);
      } else {
        return [...prev, file];
      }
    });
  };

  // const removeSelectedFile = (path: string) => {
  //   setSelectedFiles((prev) => prev.filter(f => f.path !== path));
  // };

  const handleCreateGallery = async (title: string, summary: string) => {
    if (!selectedFiles.length) return;
    if (!user) {
      alert('You must be logged in to create a gallery.');
      return;
    }
    
    try {
      // For thumbnail, use the first image/video's thumbnailUrl or path
      const first = selectedFiles[0];
      const thumbnail = first.thumbnailUrl || first.path;
      
      // Prepare media paths and types
      const mediaPaths = selectedFiles.map(f => f.path);
      const mediaTypes = selectedFiles.map(f => f.isVideo ? 'video' : 'image');
      
      const { error } = await createGallery({
        title,
        summary,
        user_id: user.username, // Using username as user_id
        user_email: user.email,
        thumbnail_path: thumbnail,
        media_paths: mediaPaths,
        media_types: mediaTypes
      });
      
      if (error) {
        alert('Failed to create gallery: ' + error.message);
        return;
      }
      
      setSelectedFiles([]);
      setShowCreateModal(false);
      navigate('/gallery');
    } catch (err) {
      console.error('Error creating gallery:', err);
      alert('An unexpected error occurred while creating the gallery.');
    }
  };

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [loadingVideo, setLoadingVideo] = useState<Record<string, boolean>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<Record<string, string>>({});
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; path: string } | null>(null);

  // Cache for video URLs to avoid unnecessary API calls
  const [videoUrlCache, setVideoUrlCache] = useState<Record<string, { url: string; timestamp: number }>>({});
  const VIDEO_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  const getVideoUrl = async (file: FileType): Promise<string> => {
    const now = Date.now();
    const cached = videoUrlCache[file.path];
    // Check cache first
    if (cached && (now - cached.timestamp) < VIDEO_CACHE_DURATION) {
      console.log('Using cached video URL');
      return cached.url;
    }
    // Try to get a direct download link first
    let url: string | null = null;
    try {
      url = await dropboxService.getDownloadLink(file.path);      // Convert to direct link if needed
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
        url = await dropboxService.getVideoLink(file.path);
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
      [file.path]: { url, timestamp: now }
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

  const handleImageClick = (file: FileType) => {
    if (file.thumbnailUrl) {
      setSelectedImage(file.thumbnailUrl);
      setSelectedFileName(file.name);
      setIsPreviewOpen(true);
    }
  };

  const handleVideoClick = async (file: FileType) => {
    // If this video is already selected, close it
    if (selectedVideo?.path === file.path) {
      setSelectedVideo(null);
      return;
    }
    setLoadingVideo(prev => ({ ...prev, [file.path]: true }));
    try {
      const videoUrl = await getVideoUrl(file);
      console.log('Got video URL:', videoUrl);
      if (!videoUrl) {
        throw new Error('Failed to get video URL');
      }
      setSelectedVideo({ url: videoUrl, path: file.path });
    } catch (error) {
      console.error('Error getting video URL:', error);
      alert('Failed to load video. Please try again.');
      setSelectedVideo(null);
    } finally {
      setLoadingVideo(prev => ({ ...prev, [file.path]: false }));
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

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {safeResults.map((file, idx) => (
          <div
            key={file.id || idx}
            className={`group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
              selectedFiles.some(f => f.path === file.path) 
                ? 'ring-2 ring-brand-forest shadow-lg scale-[1.02]' 
                : ''
            }`}
            tabIndex={0}
          >
            {/* Modern Custom Checkbox */}
            <div className="absolute top-3 left-3 z-20">
              <label className="relative cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFiles.some(f => f.path === file.path)}
                  onChange={e => { e.stopPropagation(); toggleSelectFile(file); }}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  selectedFiles.some(f => f.path === file.path)
                    ? 'bg-brand-forest border-brand-forest shadow-lg'
                    : 'bg-white/90 border-white/50 backdrop-blur-sm hover:border-brand-forest/50'
                }`}>
                  {selectedFiles.some(f => f.path === file.path) && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>
            </div>

            {/* File Type Badge */}
            <div className="absolute top-3 right-3 z-20">
              <span className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${
                file.isVideo 
                  ? 'bg-red-500/90 text-white' 
                  : 'bg-blue-500/90 text-white'
              }`}>
                {file.isVideo ? 'VIDEO' : 'IMAGE'}
              </span>
            </div>

            {/* Media Container */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
              {file.thumbnailUrl ? (
                <div 
                  className="w-full h-full relative cursor-pointer"
                  onClick={() => file.isVideo ? handleVideoClick(file) : handleImageClick(file)}
                >
                  {file.isVideo && playingVideos[file.path] ? (
                    <div className="video-container" onClick={(e) => e.stopPropagation()}>
                      <video
                        src={playingVideos[file.path]}
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
                            delete next[file.path];
                            return next;
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Error loading thumbnail:', file.path);
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '';
                          target.style.display = 'none';
                        }}
                      />
                      {loadingVideo[file.path] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent"></div>
                        </div>
                      )}
                      {file.isVideo && !loadingVideo[file.path] && (
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
                        {dropboxService.formatFileSize(file.size)} • {new Date(file.serverModified).toLocaleDateString()}
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
                    handleDownload(file.path, file.name);
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
                  {new Date(file.serverModified).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
        
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
      
      {/* Enhanced Gallery Selection Panel */}
      {selectedFiles.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 backdrop-blur-xl bg-white/95">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-forest rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{selectedFiles.length}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-brand-forest text-white rounded-xl hover:bg-brand-olive transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Create Gallery
              </button>
              <button
                onClick={() => setSelectedFiles([])}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
      
      <GalleryCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGallery}
      />
    </div>
  );
};
