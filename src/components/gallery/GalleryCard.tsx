import React from 'react';
import { Gallery } from '../../types/gallery';
import { useNavigate } from 'react-router-dom';

interface GalleryCardProps {
  gallery: Gallery;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ gallery }) => {
  const navigate = useNavigate();
  return (
    <div
      className="backdrop-blur-xl bg-white/70 border border-brand-softgray rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-200 cursor-pointer group overflow-hidden relative"
      onClick={() => navigate(`/gallery/${gallery.id}`)}
    >
      <div className="relative w-full h-48 overflow-hidden">
        <img
          src={gallery.resolved_thumbnail_url || gallery.thumbnail_path}
          alt={gallery.title}
          className="w-full h-48 object-cover rounded-t-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-90 group-hover:scale-105 group-hover:brightness-90"
          onLoad={e => (e.currentTarget.style.opacity = '1')}
        />
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent px-4 py-2">
          <div className="text-white font-bold text-lg truncate drop-shadow-md">{gallery.title}</div>
        </div>
        {/* Media count badge */}
        <div className="absolute top-3 right-3 bg-brand-forest text-white text-xs font-semibold rounded-full px-3 py-1 shadow">
          {gallery.media_paths.length} {gallery.media_paths.length === 1 ? (gallery.media_types[0] === 'video' ? 'video' : 'image') : 'items'}
        </div>
      </div>
      <div className="p-4">
        <div className="text-gray-700 text-sm mb-2 line-clamp-2 min-h-[2.5em]">{gallery.summary}</div>
      </div>
    </div>
  );
};

export default GalleryCard;
