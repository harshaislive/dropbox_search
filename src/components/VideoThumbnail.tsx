'use client';

import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  thumbnailUrl?: string;
  fileName: string;
  className?: string;
}

export default function VideoThumbnail({
  thumbnailUrl,
  fileName,
  className = ''
}: VideoThumbnailProps) {
  return (
    <div className={`relative ${className}`}>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center glass-loading">
          <div className="text-center">
            <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Video</p>
          </div>
        </div>
      )}

      {/* Video Type Badge */}
      <div className="absolute top-3 left-3">
        <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
          <Play className="w-3 h-3" />
          <span>VIDEO</span>
        </div>
      </div>

      {/* Subtle Play Indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200">
          <Play className="w-5 h-5 text-white opacity-90 ml-0.5" />
        </div>
      </div>
    </div>
  );
}