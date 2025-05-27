import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  isVideo?: boolean;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  isOpen,
  onClose,
  fileName,
  isVideo = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Reset states when modal opens
      setIsLoading(true);
      setError(null);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLoadSuccess = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleLoadError = () => {
    setIsLoading(false);
    setError('Failed to load media. Please try again.');
  };
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-6xl w-[95%] max-h-[90vh] glass-card animate-in zoom-in duration-300 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all duration-200"
        >
          <X size={20} />
        </button>
        
        <div className="w-full h-full flex flex-col">
          <div className="text-lg font-semibold text-neutral-800 p-6 border-b border-neutral-200/50 bg-white/80 backdrop-blur-sm">
            {fileName}
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-gradient-to-br from-neutral-50/80 to-neutral-100/80 backdrop-blur-sm relative">
            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent"></div>
                  <p className="text-sm text-neutral-600 font-medium">Loading {isVideo ? 'video' : 'image'}...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4 text-red-500">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm font-medium">{error}</p>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      setError(null);
                    }}
                    className="btn-primary"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Media Content */}
            {isVideo ? (
              <video
                key={imageUrl}
                src={imageUrl}
                controls
                className={`max-w-full max-h-[75vh] rounded-xl shadow-2xl ${isLoading ? 'invisible' : 'visible'}`}
                autoPlay
                playsInline
                controlsList="nodownload"
                onLoadStart={() => setIsLoading(true)}
                onCanPlay={handleLoadSuccess}
                onError={handleLoadError}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={imageUrl}
                alt={fileName}
                className={`max-w-full max-h-[75vh] rounded-xl shadow-2xl object-contain ${isLoading ? 'invisible' : 'visible'}`}
                onLoad={handleLoadSuccess}
                onError={handleLoadError}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
