import React, { useState, useEffect } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';
import { FileType } from '../services/api';
import { dropboxService } from '../services/api';
import { Play, Download } from 'lucide-react';

interface SearchResultsProps {
  results: FileType[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
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

    // Get fresh URL
    const url = await dropboxService.getVideoLink(file.path);
    
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
    try {
      // If this video is already selected, close it
      if (selectedVideo?.path === file.path) {
        setSelectedVideo(null);
        return;
      }

      setLoadingVideo(prev => ({ ...prev, [file.path]: true }));
      
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
  };

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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {results.map((file) => (
        <div
          key={file.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100 hover:border-[#6b9e45]"
        >
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {file.thumbnailUrl ? (
              <div 
                className="w-full h-full cursor-pointer relative group"
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
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#6b9e45] border-t-transparent"></div>
                      </div>
                    )}
                    {file.isVideo && !loadingVideo[file.path] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-opacity">
                        {playingVideos[file.path] ? (
                          <div className="w-8 h-8 border-2 border-[#6b9e45] rounded-full flex items-center justify-center">
                            <span className="w-3 h-3 bg-[#6b9e45]"></span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                            <Play className="w-5 h-5 text-brand ml-0.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                  <p className="text-white text-sm truncate">{file.name}</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No preview
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-800 truncate flex-1" title={file.name}>
                {file.name}
              </h3>
              <button
                onClick={() => handleDownload(file.path, file.name)}
                className="ml-2 p-1 text-gray-600 hover:text-brand transition-colors duration-200"
                title="Download file"
              >
                <Download size={18} />
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {dropboxService.formatFileSize(file.size)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(file.serverModified).toLocaleDateString()}
            </p>
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
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="relative w-full max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              Close
            </button>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
