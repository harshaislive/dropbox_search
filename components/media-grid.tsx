'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

interface MediaGridProps {
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
    progress?: number; // For batch processing progress
  };
}

export function MediaGrid({ 
  results, 
  onPreview, 
  onDownload,
  onThumbnailLoaded
}: MediaGridProps) {
  const [thumbnails, setThumbnails] = useState<ThumbnailData>({});

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
    // Only formats supported by Dropbox thumbnail API
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
      // Special handling for HEIC files
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

      // Separate regular files from HEIC files
      const regularFiles = mediaFiles.filter(file => 
        supportsThumbnail(file.extension) || isVideo(file.extension)
      );
      const heicFiles = mediaFiles.filter(file => isHeicFile(file.extension));

      // Process regular files (fast path)
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
            // Cache the thumbnail URL for reuse in previews
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

      // Process HEIC files in batch (parallel processing)
      if (heicFiles.length > 0) {
        // Initialize loading states for all HEIC files
        const heicUpdates = heicFiles.reduce((acc, file) => {
          if (!thumbnails[file.id]) {
            acc[file.id] = { url: '', loading: true, error: false, progress: 0 };
          }
          return acc;
        }, {} as Record<string, ThumbnailData[string]>);

        setThumbnails(prev => ({ ...prev, ...heicUpdates }));

        // Create file path to file ID mapping
        const pathToId = heicFiles.reduce((acc, file) => {
          acc[file.path] = file.id;
          return acc;
        }, {} as Record<string, string>);

        // Process HEIC files in batch with progress updates
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
              // Update thumbnails with results
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
                  // Cache HEIC thumbnails for reuse in previews
                  if (thumbnail) {
                    onThumbnailLoaded?.(filePath, thumbnail);
                  }
                }
              });
            });
          } catch (error) {
            console.error('HEIC batch processing failed:', error);
            // Mark all HEIC files as errored
            heicFiles.forEach(file => {
              setThumbnails(prev => ({
                ...prev,
                [file.id]: { url: '', loading: false, error: true }
              }));
            });
          }
        }
      }

      // Wait for regular files to complete
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
      {results.map((file) => {
        const thumbnail = thumbnails[file.id];
        const isMediaFile = isImage(file.extension) || isVideo(file.extension);
        const isHeic = isHeicFile(file.extension);

        return (
          <HoverCard key={file.id} openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>
              <Card 
                className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-lg"
                onClick={() => !file.isFolder && onPreview(file)}
              >
                <CardContent className="p-0 overflow-hidden">
                  {/* Thumbnail or Icon */}
                  <AspectRatio ratio={1} className="relative bg-muted/30">
                    {isMediaFile && thumbnail?.url && !thumbnail.error ? (
                      <img 
                        src={thumbnail.url} 
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={() => {
                          setThumbnails(prev => ({
                            ...prev,
                            [file.id]: { ...prev[file.id], error: true }
                          }));
                        }}
                      />
                    ) : thumbnail?.loading ? (
                      <div className={`flex flex-col items-center justify-center w-full h-full ${
                        isHeic ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20' : ''
                      }`}>
                        <Loader2 className={`w-8 h-8 animate-spin ${isHeic ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        {isHeic && (
                          <div className="mt-2 text-center">
                            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              Processing HEIC...
                            </div>
                            {thumbnail.progress !== undefined && thumbnail.progress > 0 && (
                              <div className="mt-1 text-xs text-orange-500">
                                {thumbnail.progress}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-muted/50 to-muted ${
                        ['heic', 'heif'].includes(file.extension?.toLowerCase() || '') 
                          ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20' 
                          : ''
                      }`}>
                        {getFileIcon(file, 'w-12 h-12')}
                        {['heic', 'heif'].includes(file.extension?.toLowerCase() || '') && (
                          <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
                            HEIC
                          </div>
                        )}
                      </div>
                    )}

                    {/* File Type Badge */}
                    {isVideo(file.extension) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                    )}


                    {/* File Extension Badge */}
                    {file.extension && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-2 right-2 text-xs h-5 px-1.5 bg-black/60 backdrop-blur-sm border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        {file.extension.toUpperCase()}
                      </Badge>
                    )}

                    {/* Quick Actions */}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {!file.isFolder && isImage(file.extension) || isVideo(file.extension) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0 bg-black/60 backdrop-blur-sm hover:bg-black/80 border-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(file);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </Button>
                      ) : null}
                      {!file.isFolder && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0 bg-black/60 backdrop-blur-sm hover:bg-black/80 border-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(file);
                          }}
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </Button>
                      )}
                    </div>
                  </AspectRatio>

                  {/* File Info */}
                  <div className="p-3 space-y-1">
                    <h3 className="font-medium text-sm truncate leading-tight">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </HoverCardTrigger>

            <HoverCardContent className="w-80" side="top">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    {isMediaFile && thumbnail?.url && !thumbnail.error ? (
                      <AvatarImage src={thumbnail.url} alt={file.name} />
                    ) : (
                      <AvatarFallback>
                        {getFileIcon(file, 'w-5 h-5')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">{file.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{file.path}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3 h-3" />
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(file.modified)}</span>
                  </div>
                </div>

                {file.extension && (
                  <Badge variant="outline" className="w-fit">
                    {file.extension.toUpperCase()} File
                  </Badge>
                )}

                <div className="flex gap-2 pt-2">
                  {!file.isFolder && (isImage(file.extension) || isVideo(file.extension)) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onPreview(file)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  )}
                  {!file.isFolder && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onDownload(file)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
}