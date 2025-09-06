'use client';

import { useState, useEffect } from 'react';
import { FileText, Image, Video, Folder, File, Loader2 } from 'lucide-react';

interface FileThumbnailProps {
  file: {
    id: string;
    name: string;
    path: string;
    isFolder: boolean;
    extension?: string;
    tag: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function FileThumbnail({ file, size = 'md', showIcon = true }: FileThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sizeMap = {
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4', thumbnail: 'w128h128' },
    md: { container: 'w-12 h-12', icon: 'w-6 h-6', thumbnail: 'w480h320' },
    lg: { container: 'w-16 h-16', icon: 'w-8 h-8', thumbnail: 'w640h480' },
  };

  const { container, icon, thumbnail } = sizeMap[size];

  const isImage = () => {
    const ext = file.extension?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tiff', 'tif', 'bmp', 'ppm'].includes(ext || '');
  };

  const supportsThumbnail = () => {
    const ext = file.extension?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm'].includes(ext || '');
  };

  const isVideo = () => {
    const ext = file.extension?.toLowerCase();
    return ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '');
  };

  const isPdf = () => {
    return file.extension?.toLowerCase() === 'pdf';
  };

  const isDocument = () => {
    const ext = file.extension?.toLowerCase();
    return ['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext || '');
  };

  const getFileIcon = () => {
    if (file.isFolder) return <Folder className={`${icon} text-blue-600`} />;
    if (isImage()) {
      const ext = file.extension?.toLowerCase();
      if (['heic', 'heif'].includes(ext || '')) {
        return <Image className={`${icon} text-orange-600`} />;
      }
      return <Image className={`${icon} text-green-600`} />;
    }
    if (isVideo()) return <Video className={`${icon} text-purple-600`} />;
    if (isPdf() || isDocument()) return <FileText className={`${icon} text-red-600`} />;
    return <File className={`${icon} text-gray-600`} />;
  };

  useEffect(() => {
    const loadThumbnail = async () => {
      // Only load thumbnails for supported images and videos
      if (!supportsThumbnail() && !isVideo()) return;
      
      setLoading(true);
      setError(false);
      
      try {
        const response = await fetch(
          `/api/thumbnail?path=${encodeURIComponent(file.path)}&size=${thumbnail}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setThumbnailUrl(data.thumbnailUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load thumbnail:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadThumbnail();
  }, [file.path, thumbnail]);

  return (
    <div className={`${container} relative flex-shrink-0 overflow-hidden rounded-lg bg-muted/50 border`}>
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        </div>
      ) : thumbnailUrl && !error ? (
        <img
          src={thumbnailUrl}
          alt={file.name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {showIcon && getFileIcon()}
        </div>
      )}
      
      {/* File type badge for images/videos with thumbnails */}
      {thumbnailUrl && !error && (isImage() || isVideo()) && (
        <div className="absolute bottom-0 right-0 m-1">
          <div className="bg-black/60 backdrop-blur-sm rounded px-1 py-0.5">
            {isImage() ? (
              <Image className="w-2 h-2 text-white" />
            ) : (
              <Video className="w-2 h-2 text-white" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}