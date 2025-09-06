'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { 
  FileText, Image, Video, Folder, File, 
  Download, Eye, Clock, Play, Calendar, HardDrive, Loader2
} from 'lucide-react';
import { processHeicThumbnail, isHeicFile } from '@/lib/heic-processor';

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

interface ContentCarouselProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  results: SearchResult[];
  onPreview: (file: SearchResult) => void;
  onDownload: (file: SearchResult) => void;
  onThumbnailLoaded?: (filePath: string, thumbnailUrl: string) => void;
}

interface ThumbnailData {
  url: string;
  loading: boolean;
  error: boolean;
  progress?: number;
}

export function ContentCarousel({ 
  title, 
  description, 
  icon, 
  accentColor,
  results, 
  onPreview, 
  onDownload,
  onThumbnailLoaded
}: ContentCarouselProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, ThumbnailData>>({});

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isImage = (extension?: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'tiff', 'tif', 'bmp', 'ppm'].includes(extension?.toLowerCase() || '');
  };

  const supportsThumbnail = (extension?: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm'].includes(extension?.toLowerCase() || '');
  };

  const isVideo = (extension?: string) => {
    return ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension?.toLowerCase() || '');
  };

  const getFileIcon = (file: SearchResult) => {
    if (file.isFolder) return <Folder className="w-5 h-5 text-blue-500" />;
    if (isImage(file.extension)) {
      if (['heic', 'heif'].includes(file.extension?.toLowerCase() || '')) {
        return <Image className="w-5 h-5 text-orange-500" />;
      }
      return <Image className="w-5 h-5 text-green-500" />;
    }
    if (isVideo(file.extension)) return <Video className="w-5 h-5 text-purple-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  // Load thumbnails for media files
  useEffect(() => {
    const loadThumbnails = async () => {
      const mediaFiles = results.filter(file => 
        !file.isFolder && (supportsThumbnail(file.extension) || isVideo(file.extension) || isHeicFile(file.extension))
      );

      // Process regular files
      const regularFiles = mediaFiles.filter(file => 
        supportsThumbnail(file.extension) || isVideo(file.extension)
      );
      const heicFiles = mediaFiles.filter(file => isHeicFile(file.extension));

      // Load regular thumbnails
      regularFiles.forEach(async (file) => {
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
            throw new Error('Thumbnail failed');
          }
        } catch (error) {
          setThumbnails(prev => ({
            ...prev,
            [file.id]: { url: '', loading: false, error: true }
          }));
        }
      });

      // Process HEIC files
      if (heicFiles.length > 0) {
        heicFiles.forEach(file => {
          if (!thumbnails[file.id]) {
            setThumbnails(prev => ({
              ...prev,
              [file.id]: { url: '', loading: true, error: false, progress: 0 }
            }));
          }
        });

        for (const file of heicFiles) {
          try {
            const thumbnail = await processHeicThumbnail(file.path, 640, 0.9);
            setThumbnails(prev => ({
              ...prev,
              [file.id]: { url: thumbnail, loading: false, error: false }
            }));
            onThumbnailLoaded?.(file.path, thumbnail);
          } catch (error) {
            setThumbnails(prev => ({
              ...prev,
              [file.id]: { url: '', loading: false, error: true }
            }));
          }
        }
      }
    };

    if (results.length > 0) {
      loadThumbnails();
    }
  }, [results]);

  if (results.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-6 px-6">
        <div 
          className="p-3 rounded-xl shadow-lg"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <div style={{ color: accentColor }}>
            {icon}
          </div>
        </div>
        <div>
          <h2 
            className="text-2xl font-light text-foreground"
            style={{ fontFamily: 'ABC Arizona Flare, serif' }}
          >
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {results.length} items
        </Badge>
      </div>

      {/* Carousel */}
      <div className="px-6">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {results.map((file) => {
              const thumbnail = thumbnails[file.id];
              const isMediaFile = isImage(file.extension) || isVideo(file.extension);
              const isHeic = isHeicFile(file.extension);

              return (
                <CarouselItem key={file.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <HoverCard openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <Card className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden">
                        <CardContent className="p-0">
                          {/* Thumbnail */}
                          <AspectRatio ratio={4/3} className="relative bg-muted/30">
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
                                <Loader2 className={`w-6 h-6 animate-spin ${isHeic ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                {isHeic && thumbnail.progress !== undefined && (
                                  <div className="mt-2 w-16">
                                    <Progress value={thumbnail.progress} className="h-1" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={`flex flex-col items-center justify-center w-full h-full ${
                                isHeic ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20' : 'bg-gradient-to-br from-muted/50 to-muted'
                              }`}>
                                {getFileIcon(file)}
                              </div>
                            )}

                            {/* Video Play Indicator */}
                            {isVideo(file.extension) && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <Play className="w-4 h-4 text-white fill-white" />
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
                              {!file.isFolder && (isImage(file.extension) || isVideo(file.extension)) && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 w-6 p-0 bg-black/60 backdrop-blur-sm hover:bg-black/80 border-white/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPreview(file);
                                  }}
                                >
                                  <Eye className="w-3 h-3 text-white" />
                                </Button>
                              )}
                              {!file.isFolder && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 w-6 p-0 bg-black/60 backdrop-blur-sm hover:bg-black/80 border-white/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload(file);
                                  }}
                                >
                                  <Download className="w-3 h-3 text-white" />
                                </Button>
                              )}
                            </div>
                          </AspectRatio>

                          {/* File Info */}
                          <div className="p-3 space-y-1">
                            <h3 className="font-medium text-sm truncate leading-tight">{file.name}</h3>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <span>{formatDate(file.modified)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </HoverCardTrigger>

                    <HoverCardContent className="w-80" side="top">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {isMediaFile && thumbnail?.url && !thumbnail.error ? (
                              <img src={thumbnail.url} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              getFileIcon(file)
                            )}
                          </div>
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
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </div>
    </div>
  );
}