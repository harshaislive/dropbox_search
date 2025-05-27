import React, { useState, useEffect } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';
import { FileType } from '../services/api';
import { dropboxService } from '../services/api';
import { Play, Download } from 'lucide-react';

interface SearchResultsProps {
  results: FileType[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  const safeResults = Array.isArray(results) ? results : [];
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
      url = await dropboxService.getDownloadLink(file.path);
      // Convert to direct link if needed
      if (url.includes('www.dropbox.com')) {
        url = dropboxService.convertToDirectLink(url);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
      {safeResults.map((file, idx) => (
        <div
          key={file.id || idx}
          className="glass-card group cursor-pointer transform hover:scale-[1.02] transition-all duration-300 ease-out"
        >
          <div className="relative aspect-square bg-gradient-to-br from-neutral-50 to-neutral-100 overflow-hidden rounded-xl">
            {file.thumbnailUrl ? (
              <div 
                className="w-full h-full relative"
                onClick={() => file.isVideo ? handleVideoClick(file) : handleImageClick(file)}
              >
                {file.isVideo && playingVideos[file.path] ? (
                  <div className="video-container" onClick={(e) => e.stopPropagation()}>
                    <video
                      src={playingVideos[file.path]}
                      controls
                      autoPlay
                      preload="auto"
                      className="w-full h-full object-cover rounded-xl"
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
                      className="w-full h-full object-cover rounded-xl transform group-hover:scale-110 transition-transform duration-500 ease-out"
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent"></div>
                      </div>
                    )}
                    {file.isVideo && !loadingVideo[file.path] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all duration-300 rounded-xl">
                        {playingVideos[file.path] ? (
                          <div className="w-10 h-10 border-2 border-primary rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
                            <span className="w-4 h-4 bg-primary rounded-full"></span>
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
                            <Play className="w-6 h-6 text-primary ml-0.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-3 rounded-b-xl">
                  <p className="text-white text-sm font-medium truncate">{file.name}</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400 rounded-xl">
                <div className="text-center">
                  <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs">No preview</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-800 leading-tight flex-1 mr-2" title={file.name}>
                {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(file.path, file.name);
                }}
                className="p-2 text-neutral-500 hover:text-primary transition-colors duration-200 hover:bg-neutral-100 rounded-lg flex-shrink-0"
                title="Download file"
              >
                <Download size={16} />
              </button>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-primary">
                {dropboxService.formatFileSize(file.size)}
              </div>
              <p className="text-xs text-neutral-500">
                {new Date(file.serverModified).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
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
  );
};
