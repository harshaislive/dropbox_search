'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface ResponsiveThumbnailProps {
  thumbnailUrl?: string;
  fileName: string;
  className?: string;
  quality?: 'low' | 'medium' | 'high';
}

export default function ResponsiveThumbnail({
  thumbnailUrl,
  fileName,
  className = '',
  quality = 'high'
}: ResponsiveThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  if (!thumbnailUrl || imageError) {
    return (
      <div className={`w-full h-full flex items-center justify-center glass-loading ${className}`}>
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No Preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-10 ${className}`}>
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div className="absolute inset-0 glass-loading flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300/50 border-t-[var(--beforest-forest-green)] rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* High-quality image */}
      <img
        src={thumbnailUrl}
        alt={fileName}
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        decoding="async"
      />
      
      {/* Image type badge - hidden on card view, shown on preview */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="glass-badge text-xs">
          {fileName.split('.').pop()?.toUpperCase() || 'IMG'}
        </div>
      </div>
    </div>
  );
}