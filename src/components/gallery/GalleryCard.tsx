import React from 'react';
import { Gallery } from '../../types/gallery';
import { useNavigate } from 'react-router-dom';
import { Calendar, Image, Video, User } from 'lucide-react';

interface GalleryCardProps {
  gallery: Gallery;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ gallery }) => {
  const navigate = useNavigate();
  
  const getMediaStats = () => {
    const imageCount = gallery.media_types?.filter(type => type === 'image').length || 0;
    const videoCount = gallery.media_types?.filter(type => type === 'video').length || 0;
    return { imageCount, videoCount };
  };

  const { imageCount, videoCount } = getMediaStats();

  return (
    <div
      className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02]"
      onClick={() => navigate(`/gallery/${gallery.id}`)}
    >
      {/* Hero Image Container */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        <img
          src={gallery.resolved_thumbnail_url || gallery.thumbnail_path}
          alt={gallery.title}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
          onLoad={e => (e.currentTarget.style.opacity = '1')}
          style={{ opacity: 0 }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        
        {/* Media Count Badge */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center space-x-1 shadow-lg">
              <div className="flex items-center space-x-1">
                {imageCount > 0 && (
                  <>
                    <Image className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-800">{imageCount}</span>
                  </>
                )}
                {videoCount > 0 && (
                  <>
                    {imageCount > 0 && <span className="text-gray-400">•</span>}
                    <Video className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-semibold text-gray-800">{videoCount}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-white text-xl font-bold leading-tight drop-shadow-lg group-hover:text-white/90 transition-colors duration-300">
            {gallery.title}
          </h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Summary */}
        {gallery.summary && (
          <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 group-hover:text-gray-700 transition-colors duration-300">
            {gallery.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span className="font-medium">
                {gallery.user_email ? gallery.user_email.split('@')[0] : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>
                {gallery.created_at 
                  ? new Date(gallery.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Unknown'
                }
              </span>
            </div>
          </div>
          
          {/* Total Items */}
          <div className="bg-brand-forest/10 text-brand-forest px-2 py-1 rounded-full font-semibold">
            {gallery.media_paths?.length || 0} items
          </div>
        </div>
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-brand-forest/20 transition-all duration-300 pointer-events-none" />
      
      {/* Bottom Gradient Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-forest via-brand-olive to-brand-forest opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

export default GalleryCard;
