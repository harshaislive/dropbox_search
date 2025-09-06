'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileThumbnail } from '@/components/file-thumbnail';
import { Badge } from '@/components/ui/badge';
import { Clock, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoverPreviewProps {
  file: {
    id: string;
    name: string;
    path: string;
    size?: number;
    isFolder: boolean;
    modified: string;
    tag: string;
    extension?: string;
  };
  children: React.ReactNode;
  onPreview: () => void;
  onDownload: () => void;
}

export function HoverPreview({ file, children, onPreview, onDownload }: HoverPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);

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

  const isPreviewable = () => {
    const ext = file.extension?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'webm'].includes(ext || '');
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}
      
      {/* Hover Preview Card */}
      {isHovering && !file.isFolder && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 pointer-events-none">
          <Card className="shadow-xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <FileThumbnail file={file} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-sm mb-1">{file.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mb-2">{file.path}</p>
                  
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {file.size && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Size:</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(file.modified)}</span>
                    </div>
                    {file.extension && (
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {file.extension.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1 mt-3 pointer-events-auto">
                    {isPreviewable() && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={onPreview}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={onDownload}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}