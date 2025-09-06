'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, X, Maximize2, Clock, HardDrive, 
  FileText, Image, Video, AlertCircle, Loader2,
  ExternalLink, Share2, Heart, Bookmark
} from 'lucide-react';

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

interface ImmersivePreviewProps {
  file: SearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  loading: boolean;
  onDownload: (file: SearchResult) => void;
}

export function ImmersivePreview({
  file,
  isOpen,
  onClose,
  previewUrl,
  loading,
  onDownload
}: ImmersivePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!file) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = () => {
    if (file.isFolder) return <FileText className="w-6 h-6" />;
    
    const ext = file.extension?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'].includes(ext || '')) {
      return <Image className="w-6 h-6 text-green-600" />;
    }
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '')) {
      return <Video className="w-6 h-6 text-purple-600" />;
    }
    return <FileText className="w-6 h-6 text-blue-600" />;
  };

  const isImage = file.extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'].includes(file.extension.toLowerCase());
  const isVideo = file.extension && ['mp4', 'mov', 'webm'].includes(file.extension.toLowerCase());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-[100vw] max-h-[100vh] w-full h-full' : 'max-w-6xl max-h-[90vh]'} p-0 overflow-hidden bg-[#342e29]/95 backdrop-blur-xl border-[#ff774a]/20`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#342e29] to-[#002140]">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-[#ff774a]/20">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-light text-[#fdfbf7] truncate" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
                {file.name}
              </h2>
              <p className="text-sm text-[#fdfbf7]/70 truncate">{file.path}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-[#fdfbf7] hover:bg-[#fdfbf7]/10"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#fdfbf7] hover:bg-[#fdfbf7]/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className={`flex ${isFullscreen ? 'flex-col' : 'flex-row'} flex-1 overflow-hidden`}>
          {/* Preview Area */}
          <div className={`${isFullscreen ? 'flex-1' : 'flex-1'} flex items-center justify-center p-6 bg-[#002140]/20`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#ff774a]" />
                <p className="text-[#fdfbf7]/70">Loading preview...</p>
              </div>
            ) : previewUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                {isImage ? (
                  <img 
                    src={previewUrl} 
                    alt={file.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                ) : isVideo ? (
                  <video 
                    src={previewUrl} 
                    controls
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-[#ff774a]/20 flex items-center justify-center">
                      {getFileIcon()}
                    </div>
                    <p className="text-[#fdfbf7]/70">Preview not available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertCircle className="w-12 h-12 text-[#ff774a]/60" />
                <p className="text-[#fdfbf7]/70">Failed to load preview</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className={`${isFullscreen ? 'h-auto' : 'w-80'} bg-[#342e29]/80 backdrop-blur-sm border-l border-[#ff774a]/10 flex flex-col`}>
            {/* File Details */}
            <div className="p-6 space-y-6 flex-1">
              <div>
                <h3 className="text-lg font-light text-[#fdfbf7] mb-4" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
                  File Details
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-[#ffc083]" />
                    <div>
                      <p className="text-xs text-[#fdfbf7]/60 uppercase tracking-wide">Size</p>
                      <p className="text-[#fdfbf7] font-medium">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#ffc083]" />
                    <div>
                      <p className="text-xs text-[#fdfbf7]/60 uppercase tracking-wide">Modified</p>
                      <p className="text-[#fdfbf7] font-medium">{formatDate(file.modified)}</p>
                    </div>
                  </div>
                  
                  {file.extension && (
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-[#ffc083]" />
                      <div>
                        <p className="text-xs text-[#fdfbf7]/60 uppercase tracking-wide">Type</p>
                        <Badge 
                          variant="outline" 
                          className="bg-[#ff774a]/20 border-[#ff774a]/30 text-[#ff774a] hover:bg-[#ff774a]/30"
                        >
                          {file.extension.toUpperCase()} File
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-[#fdfbf7]/10" />

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-light text-[#fdfbf7] mb-4" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
                  Quick Actions
                </h3>
                
                <div className="space-y-2">
                  <Button
                    onClick={() => onDownload(file)}
                    className="w-full justify-start bg-gradient-to-r from-[#ff774a] to-[#86312b] hover:from-[#86312b] hover:to-[#ff774a] text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                  
                  {previewUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="w-full justify-start border-[#fdfbf7]/20 text-[#fdfbf7] hover:bg-[#fdfbf7]/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#fdfbf7]/20 text-[#fdfbf7] hover:bg-[#fdfbf7]/10"
                    disabled
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Link
                  </Button>
                </div>
              </div>

              {/* Path */}
              <div>
                <h3 className="text-lg font-light text-[#fdfbf7] mb-2" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
                  Location
                </h3>
                <p className="text-sm text-[#fdfbf7]/70 font-mono bg-[#002140]/30 p-3 rounded-lg break-all">
                  {file.path}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#fdfbf7]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#fdfbf7]/60 hover:text-[#ffc083] hover:bg-[#ffc083]/10"
                    disabled
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#fdfbf7]/60 hover:text-[#ffc083] hover:bg-[#ffc083]/10"
                    disabled
                  >
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-[#fdfbf7]/50">Beforest Digital Vault</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}