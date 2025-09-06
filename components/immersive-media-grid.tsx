'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { 
  FileText, Image, Video, Folder, File, 
  Download, Eye, Clock, Play, FileIcon,
  Calendar, HardDrive, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { processHeicThumbnail, processHeicBatch, isHeicFile } from '@/lib/heic-processor';

interface SearchResult {
  id: string;
  name: string;
  path: string;
  size?: number;
  isFolder: boolean;
  modified: string;
  tag: string;
  extension?: string;
}

interface ImmersiveMediaGridProps {
  results: SearchResult[];
  onPreview: (file: SearchResult) => void;
  onDownload: (file: SearchResult) => void;
  onThumbnailLoaded?: (filePath: string, thumbnailUrl: string) => void;
}

interface ThumbnailData {
  [key: string]: {
    url: string;
    loading: boolean;
    error: boolean;
    progress?: number;
  };
}

export function ImmersiveMediaGrid({ 
  results, 
  onPreview, 
  onDownload,
  onThumbnailLoaded
}: ImmersiveMediaGridProps) {
  const [thumbnails, setThumbnails] = useState<ThumbnailData>({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const retryThumbnail = async (file: SearchResult) => {
    setThumbnails(prev => ({
      ...prev,
      [file.id]: { url: '', loading: true, error: false }
    }));

    try {
      if (isHeicFile(file.extension)) {
        const heicThumbnail = await processHeicThumbnail(file.path, 640, 0.9);
        setThumbnails(prev => ({
          ...prev,
          [file.id]: { url: heicThumbnail || '', loading: false, error: !heicThumbnail }
        }));
        if (heicThumbnail) {
          onThumbnailLoaded?.(file.path, heicThumbnail);
        }
      } else {
        const response = await fetch(`/api/thumbnail?path=${encodeURIComponent(file.path)}&size=w640h480`);
        if (response.ok) {
          const data = await response.json();
          setThumbnails(prev => ({
            ...prev,
            [file.id]: { url: data.thumbnailUrl, loading: false, error: false }
          }));
          onThumbnailLoaded?.(file.path, data.thumbnailUrl);
        } else {
          throw new Error('Thumbnail API failed');
        }
      }
    } catch (error) {
      setThumbnails(prev => ({
        ...prev,
        [file.id]: { url: '', loading: false, error: true }
      }));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isImage = (extension?: string) => {
    // Exclude non-image files that might be misclassified as images
    const ext = extension?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'tiff', 'tif', 'bmp', 'ppm'];
    const nonImageExtensions = ['ai', 'eps', 'ps', 'psd', 'sketch', 'fig', 'xd', 'indd', 'dwg', 'dxf'];
    
    return imageExtensions.includes(ext) && !nonImageExtensions.includes(ext);
  };

  const supportsThumbnail = (extension?: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm'].includes(extension?.toLowerCase() || '');
  };

  const isVideo = (extension?: string) => {
    return ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension?.toLowerCase() || '');
  };

  const isPdf = (extension?: string) => {
    return extension?.toLowerCase() === 'pdf';
  };

  const getFileIcon = (file: SearchResult, size = 'w-6 h-6') => {
    if (file.isFolder) return <Folder className={`${size} text-blue-500`} />;
    if (isImage(file.extension)) {
      if (['heic', 'heif'].includes(file.extension?.toLowerCase() || '')) {
        return <Image className={`${size} text-orange-500`} />;
      }
      return <Image className={`${size} text-green-500`} />;
    }
    if (isVideo(file.extension)) return <Video className={`${size} text-purple-500`} />;
    if (isPdf(file.extension)) return <FileText className={`${size} text-red-500`} />;
    return <FileIcon className={`${size} text-gray-500`} />;
  };

  // Load thumbnails for images and videos
  useEffect(() => {
    const loadThumbnails = async () => {
      const mediaFiles = results.filter(file => 
        !file.isFolder && (supportsThumbnail(file.extension) || isVideo(file.extension) || isHeicFile(file.extension))
      );

      const regularFiles = mediaFiles.filter(file => 
        supportsThumbnail(file.extension) || isVideo(file.extension)
      );
      const heicFiles = mediaFiles.filter(file => isHeicFile(file.extension));

      // Process regular files
      const regularPromises = regularFiles.map(async (file) => {
        if (thumbnails[file.id]) return;

        setThumbnails(prev => ({
          ...prev,
          [file.id]: { url: '', loading: true, error: false }
        }));

        try {
          const response = await fetch(`/api/thumbnail?path=${encodeURIComponent(file.path)}&size=w640h480`);
          if (response.ok) {
            const data = await response.json();
            setThumbnails(prev => ({
              ...prev,
              [file.id]: { url: data.thumbnailUrl, loading: false, error: false }
            }));
            onThumbnailLoaded?.(file.path, data.thumbnailUrl);
          } else {
            throw new Error('Thumbnail API failed');
          }
        } catch (error) {
          setThumbnails(prev => ({
            ...prev,
            [file.id]: { url: '', loading: false, error: true }
          }));
        }
      });

      // Process HEIC files in batch
      if (heicFiles.length > 0) {
        const heicUpdates = heicFiles.reduce((acc, file) => {
          if (!thumbnails[file.id]) {
            acc[file.id] = { url: '', loading: true, error: false, progress: 0 };
          }
          return acc;
        }, {} as Record<string, ThumbnailData[string]>);

        setThumbnails(prev => ({ ...prev, ...heicUpdates }));

        const pathToId = heicFiles.reduce((acc, file) => {
          acc[file.path] = file.id;
          return acc;
        }, {} as Record<string, string>);

        const heicPaths = heicFiles.map(f => f.path).filter(path => !thumbnails[pathToId[path]]?.url);
        
        if (heicPaths.length > 0) {
          try {
            await processHeicBatch(
              heicPaths,
              640,
              0.9,
              (completed, total, filePath) => {
                const fileId = pathToId[filePath];
                if (fileId) {
                  setThumbnails(prev => ({
                    ...prev,
                    [fileId]: {
                      ...prev[fileId],
                      progress: Math.round((completed / total) * 100)
                    }
                  }));
                }
              }
            ).then(results => {
              Object.entries(results).forEach(([filePath, thumbnail]) => {
                const fileId = pathToId[filePath];
                if (fileId) {
                  setThumbnails(prev => ({
                    ...prev,
                    [fileId]: {
                      url: thumbnail || '',
                      loading: false,
                      error: !thumbnail,
                      progress: undefined
                    }
                  }));
                  if (thumbnail) {
                    onThumbnailLoaded?.(filePath, thumbnail);
                  }
                }
              });
            });
          } catch (error) {
            console.error('HEIC batch processing failed:', error);
            heicFiles.forEach(file => {
              setThumbnails(prev => ({
                ...prev,
                [file.id]: { url: '', loading: false, error: true }
              }));
            });
          }
        }
      }

      await Promise.allSettled(regularPromises);
    };

    if (results.length > 0) {
      loadThumbnails();
    }
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Image className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Discover the Beauty</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Start searching to explore the stunning visual world of Beforest Collectives and our vibrant ecoverse
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-4">
      {/* Uniform Square Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
        {results.map((file) => {
          const thumbnail = thumbnails[file.id];
          const isMediaFile = isImage(file.extension) || isVideo(file.extension);
          const isHeic = isHeicFile(file.extension);
          const isHovered = hoveredItem === file.id;

          return (
            <div
              key={file.id}
              className="relative group cursor-pointer aspect-square overflow-hidden rounded-sm bg-muted/30 transition-all duration-300 hover:shadow-lg"
              onMouseEnter={() => setHoveredItem(file.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem(file.id)}
              onClick={() => !file.isFolder && onPreview(file)}
            >
              {/* Main Image/Content */}
              <div className="relative w-full h-full">
                {isMediaFile && thumbnail?.url && !thumbnail.error ? (
                  <img 
                    src={thumbnail.url} 
                    alt={file.name}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-75"
                    onError={() => {
                      setThumbnails(prev => ({
                        ...prev,
                        [file.id]: { ...prev[file.id], error: true }
                      }));
                    }}
                  />
                ) : thumbnail?.loading ? (
                  <AspectRatio ratio={1} className="w-full">
                    <div className={`relative flex flex-col items-center justify-center w-full h-full ${
                      isHeic ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20' : 'bg-muted/50'
                    }`}>
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      
                      <Loader2 className={`w-12 h-12 animate-spin ${isHeic ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      {isHeic && (
                        <div className="mt-3 text-center">
                          <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                            Processing HEIC...
                          </div>
                          {thumbnail.progress !== undefined && thumbnail.progress > 0 && (
                            <div className="mt-1 text-sm text-orange-500">
                              {thumbnail.progress}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AspectRatio>
                ) : (
                  <AspectRatio ratio={1} className="w-full">
                    <div className={`flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-muted/50 to-muted transition-all duration-500 group-hover:brightness-75 ${
                      ['heic', 'heif'].includes(file.extension?.toLowerCase() || '') 
                        ? 'from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20' 
                        : ''
                    }`}>
                      {getFileIcon(file, 'w-16 h-16')}
                      {['heic', 'heif'].includes(file.extension?.toLowerCase() || '') && (
                        <div className="mt-2 text-sm text-orange-600 dark:text-orange-400 font-medium">
                          HEIC
                        </div>
                      )}
                      
                      {/* Retry button for failed thumbnails */}
                      {thumbnail?.error && isMediaFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryThumbnail(file);
                          }}
                          className="mt-2 px-2 py-1 text-xs bg-black/20 hover:bg-black/40 rounded transition-colors"
                          title="Retry loading thumbnail"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </AspectRatio>
                )}

                {/* Hover Overlay with Title and Actions */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-all duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {/* File Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 text-white">
                    <h3 className="font-semibold text-xs md:text-sm mb-1 line-clamp-1 leading-tight">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-1 md:gap-2 text-xs opacity-90">
                      {file.size && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatFileSize(file.size)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(file.modified)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {!file.isFolder && (isImage(file.extension) || isVideo(file.extension)) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-white/20 text-white hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(file);
                        }}
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    )}
                    {!file.isFolder && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-white/20 text-white hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(file);
                        }}
                      >
                        <Download className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Video Play Icon */}
                  {isVideo(file.extension) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </div>
                  )}

                  {/* File Type Indicator - Always Visible */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {file.extension && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs bg-black/60 backdrop-blur-sm border-white/20 text-white transition-opacity duration-300 ${
                          isHovered ? 'opacity-100' : 'opacity-75'
                        }`}
                      >
                        {file.extension.toUpperCase()}
                      </Badge>
                    )}
                    
                    {/* File type icon - always visible */}
                    <div className={`p-1 rounded bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                      isHovered ? 'opacity-100' : 'opacity-75'
                    }`}>
                      {getFileIcon(file, 'w-3 h-3')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}