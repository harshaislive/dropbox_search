import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGalleryWithResolvedImages, deleteGallery } from '../../services/galleryApi';
// import { Gallery } from '../../types/gallery';
import CommentSection from './CommentSection';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Download, Edit, Trash2, Calendar, User, Image, Video, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';

const GalleryDetail: React.FC = () => {
  const { galleryId } = useParams();
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; idx: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    if (!gallery) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${gallery.title}"? This action cannot be undone.`
    );
    
    if (confirmed) {
      setDeleteLoading(true);
      try {
        await deleteGallery(gallery.id);
        navigate('/gallery');
      } catch (error) {
        console.error('Failed to delete gallery:', error);
        alert('Failed to delete gallery. Please try again.');
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const handleDownload = async (mediaPath: string, fileName: string) => {
    try {
      const link = await (window as any).dropboxService.getDownloadLink(mediaPath);
      const a = document.createElement('a');
      a.href = link;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (!selectedMedia || !gallery?.resolved_media_urls) return;
    
    const currentIdx = selectedMedia.idx;
    const totalItems = gallery.resolved_media_urls.length;
    
    let newIdx;
    if (direction === 'next') {
      newIdx = currentIdx === totalItems - 1 ? 0 : currentIdx + 1;
    } else {
      newIdx = currentIdx === 0 ? totalItems - 1 : currentIdx - 1;
    }
    
    setSelectedMedia({ url: gallery.resolved_media_urls[newIdx], idx: newIdx });
  };

  const getMediaStats = () => {
    if (!gallery?.media_types) return { imageCount: 0, videoCount: 0 };
    const imageCount = gallery.media_types.filter((type: string) => type === 'image').length;
    const videoCount = gallery.media_types.filter((type: string) => type === 'video').length;
    return { imageCount, videoCount };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-forest mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Image className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Gallery not found</h2>
          <p className="text-gray-600 mb-8">The gallery you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/gallery')}
            className="inline-flex items-center px-6 py-3 bg-brand-forest text-white rounded-xl hover:bg-brand-olive transition-all duration-200 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Galleries
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.username === gallery.user_id;
  const { imageCount, videoCount } = getMediaStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/gallery')}
              className="inline-flex items-center text-gray-600 hover:text-brand-forest transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Galleries
            </button>
            
            {isOwner && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate(`/gallery/${gallery.id}/edit`)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Media Grid - Takes 2/3 width on large screens */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <div className="relative h-96 bg-white rounded-3xl overflow-hidden shadow-xl">
              <img
                src={gallery.resolved_thumbnail_url}
                alt={gallery.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{gallery.title}</h1>
                <div className="flex items-center space-x-4 text-white/90">
                  <div className="flex items-center space-x-1">
                    <Image className="w-4 h-4" />
                    <span className="text-sm font-medium">{imageCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Video className="w-4 h-4" />
                    <span className="text-sm font-medium">{videoCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {gallery.created_at 
                        ? new Date(gallery.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Unknown'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(gallery.resolved_media_urls && gallery.media_paths && gallery.media_types)
                ? gallery.resolved_media_urls.map((mediaUrl: string, idx: number) => (
                  <div 
                    key={idx} 
                    className="group relative aspect-square bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    onClick={() => setSelectedMedia({ url: mediaUrl, idx })}
                  >
                    {gallery.media_types[idx] === 'video' ? (
                      <div className="relative w-full h-full">
                        <video
                          src={mediaUrl}
                          className="w-full h-full object-cover"
                          controls={false}
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <Play className="w-6 h-6 text-brand-forest ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={`Gallery item ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    
                    {/* Download Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(gallery.media_paths[idx], gallery.media_paths[idx]?.split('/').pop() || `item-${idx + 1}`);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white"
                    >
                      <Download className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                ))
                : <div className="col-span-full text-center py-12 text-gray-500">No media found in this gallery.</div>
              }
            </div>
          </div>

          {/* Sidebar - Gallery Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Gallery Details</h2>
              
              {gallery.summary && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{gallery.summary}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Created by</p>
                    <p className="font-medium text-gray-900">
                      {gallery.user_email ? gallery.user_email.split('@')[0] : gallery.user_id || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Created on</p>
                    <p className="font-medium text-gray-900">
                      {gallery.created_at 
                        ? new Date(gallery.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Image className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Media count</p>
                    <p className="font-medium text-gray-900">
                      {gallery.media_paths?.length || 0} items
                      {imageCount > 0 && videoCount > 0 && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({imageCount} images, {videoCount} videos)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-12">
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <CommentSection galleryId={gallery.id} />
          </div>
        </div>
      </div>

      {/* Enhanced Media Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div 
            className="relative w-full max-w-6xl h-full max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Buttons */}
            {gallery.resolved_media_urls && gallery.resolved_media_urls.length > 1 && (
              <>
                <button
                  onClick={() => navigateMedia('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigateMedia('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Media Content */}
            <div className="w-full h-full flex items-center justify-center">
              {gallery.media_types && gallery.media_types[selectedMedia.idx] === 'video' ? (
                <video
                  src={gallery.resolved_media_urls[selectedMedia.idx]}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-full rounded-2xl shadow-2xl"
                />
              ) : (
                <img
                  src={gallery.resolved_media_urls[selectedMedia.idx]}
                  alt="Gallery preview"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                />
              )}
            </div>

            {/* Media Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {gallery.media_paths[selectedMedia.idx]?.split('/').pop() || `Item ${selectedMedia.idx + 1}`}
                  </p>
                  <p className="text-sm text-white/70">
                    {selectedMedia.idx + 1} of {gallery.resolved_media_urls.length}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(
                    gallery.media_paths[selectedMedia.idx],
                    gallery.media_paths[selectedMedia.idx]?.split('/').pop() || `item-${selectedMedia.idx + 1}`
                  )}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDetail;
