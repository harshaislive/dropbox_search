import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Loader } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-5xl w-[95%] max-h-[90vh] bg-white rounded-lg overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 transition-all"
        >
          <X size={24} />
        </button>
        
        <div className="w-full h-full flex flex-col">
          <div className="text-lg font-medium text-gray-900 p-4 border-b bg-white">
            {fileName}
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-gray-100 relative">
            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center space-y-4">
                  <Loader className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-600">Loading {isVideo ? 'video' : 'image'}...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center space-y-4 text-red-500">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
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
                className={`max-w-full max-h-[75vh] rounded-lg shadow-lg ${isLoading ? 'invisible' : 'visible'}`}
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
                className={`max-w-full max-h-[75vh] rounded-lg shadow-lg object-contain ${isLoading ? 'invisible' : 'visible'}`}
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
