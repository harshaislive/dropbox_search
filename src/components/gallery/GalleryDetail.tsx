import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGalleryWithResolvedImages, deleteGallery } from '../../services/galleryApi';
import { Gallery } from '../../types/gallery';
import CommentSection from './CommentSection';
import { useAuth } from '../../context/AuthContext';

const GalleryDetail: React.FC = () => {
  const { galleryId } = useParams();
  const [gallery, setGallery] = useState<any>(null); // Now includes resolved_thumbnail_url, resolved_image_urls
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; idx: number } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (galleryId) {
      getGalleryWithResolvedImages(galleryId).then(({ data }) => {
        setGallery(data);
        setLoading(false);
      });
    }
  }, [galleryId]);

  const handleDelete = async () => {
    if (gallery && window.confirm('Delete this gallery?')) {
      await deleteGallery(gallery.id);
      navigate('/gallery');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!gallery) return <div className="p-8">Gallery not found.</div>;

  const isOwner = user?.id === gallery.user_id;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="bg-white/80 rounded-2xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row gap-8 border border-brand-softgray">
        <div className="flex-1 flex flex-col items-center">
          <img
            src={gallery.resolved_thumbnail_url}
            alt={gallery.title}
            className="w-full max-w-lg h-72 md:h-80 object-cover rounded-2xl shadow mb-6 border border-gray-200"
          />
          {/* Gallery images/videos grid styled as in SearchResults */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
            {(gallery.resolved_media_urls && gallery.media_paths && gallery.media_types)
              ? gallery.resolved_media_urls.map((mediaUrl: string, idx: number) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow border border-gray-200 bg-neutral-50 aspect-[4/3] flex flex-col">
                  <button
                    type="button"
                    className="flex-1 w-full h-full"
                    style={{ minHeight: 0 }}
                    onClick={() => setSelectedMedia({ url: mediaUrl, idx })}
                  >
                    {gallery.media_types[idx] === 'video' ? (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover transition-all duration-300 opacity-0 group-hover:scale-105 group-hover:brightness-90 rounded-xl"
                        onLoadedData={e => (e.currentTarget.style.opacity = '1')}
                        onError={e => { (e.currentTarget as HTMLVideoElement).poster = '/broken-image.svg'; }}
                        controls={false}
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={`Gallery media ${idx+1}`}
                        className="w-full h-full object-cover transition-all duration-300 opacity-0 group-hover:scale-105 group-hover:brightness-90 rounded-xl"
                        onLoad={e => (e.currentTarget.style.opacity = '1')}
                        onError={e => { e.currentTarget.src = '/broken-image.svg'; }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-30 transition-all rounded-xl" />
                  </button>
                  <div className="flex items-center justify-between px-2 py-1 bg-white/80 text-xs rounded-b-xl">
                    <span className="truncate max-w-[70%]" title={gallery.media_paths[idx] || ''}>{gallery.media_paths[idx]?.split('/').pop() || `Item ${idx+1}`}</span>
                    <button
                      className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Download logic
                        const link = await (window as any).dropboxService.getDownloadLink(gallery.media_paths[idx]);
                        const a = document.createElement('a');
                        a.href = link;
                        a.download = gallery.media_paths[idx]?.split('/').pop() || `gallery-item-${idx+1}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))
              : <div className="col-span-full text-gray-400">No media found in this gallery.</div>
            }
          </div>

          {/* Modal/Preview for selected image/video */}
          {selectedMedia && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
              onClick={() => setSelectedMedia(null)}
            >
              <div
                className="relative w-full max-w-3xl animate-in zoom-in duration-300"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                  {/* Check if media is image or video by extension */}
                  {gallery.media_types && gallery.media_types[selectedMedia.idx] === 'video' ? (
                    <video
                      src={gallery.resolved_media_urls[selectedMedia.idx]}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full"
                    />
                  ) : (
                    <img
                      src={gallery.resolved_media_urls[selectedMedia.idx]}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="md:w-80 flex flex-col justify-between">
          <div>
            <div className="font-bold text-3xl mb-3 text-brand-forest drop-shadow-md">{gallery.title}</div>
            <div className="text-gray-700 mb-4 text-lg whitespace-pre-line">{gallery.summary}</div>
            <div className="mb-4 text-sm text-gray-600 space-y-1">
              <div><span className="font-medium">Created:</span> {gallery.created_at ? new Date(gallery.created_at).toLocaleString() : 'Unknown'}</div>
              <div><span className="font-medium">By:</span> {gallery.user_email || gallery.user_id || 'Unknown'}</div>
              <div><span className="font-medium">Items:</span> {gallery.media_paths?.length || 0}</div>
            </div>
            {isOwner && (
              <div className="flex space-x-2 mb-6">
                <button onClick={() => navigate(`/gallery/${gallery.id}/edit`)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow">Edit</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow">Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-10">
        <CommentSection galleryId={gallery.id} />
      </div>
    </div>
  );
};

export default GalleryDetail;
