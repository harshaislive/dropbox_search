import React, { useEffect, useState } from 'react';
// import { Gallery } from '../../types/gallery';
import { listGalleriesWithResolvedImages } from '../../services/galleryApi';
import GalleryCard from './GalleryCard';
import { Plus, Grid3X3, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GalleryList: React.FC = () => {
  const [galleries, setGalleries] = useState<any[]>([]); // Accept resolved fields
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listGalleriesWithResolvedImages().then(({ data }) => {
      if (data) setGalleries(data);
      setLoading(false);
    });
  }, []);

  const filteredGalleries = galleries.filter(gallery =>
    gallery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gallery.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-forest mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading galleries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            {/* Title and Stats */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-brand-forest rounded-xl flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Gallery Collection</h1>
              </div>
              <p className="text-gray-600 text-lg">
                {galleries.length} {galleries.length === 1 ? 'gallery' : 'galleries'} • 
                {galleries.reduce((acc, g) => acc + (g.media_paths?.length || 0), 0)} total items
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search galleries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-brand-forest focus:border-transparent transition-all duration-200 w-full sm:w-64"
                />
              </div>

              {/* Create Gallery Button */}
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center px-6 py-3 bg-brand-forest text-white rounded-xl hover:bg-brand-olive transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Gallery
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {filteredGalleries.length > 0 ? (
          <>
            {/* Results Info */}
            {searchTerm && (
              <div className="mb-6">
                <p className="text-gray-600">
                  {filteredGalleries.length === galleries.length 
                    ? `Showing all ${galleries.length} galleries`
                    : `Found ${filteredGalleries.length} of ${galleries.length} galleries`
                  }
                </p>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredGalleries.map((gallery) => (
                <GalleryCard key={gallery.id} gallery={gallery} />
              ))}
            </div>
          </>
        ) : galleries.length === 0 ? (
          /* Empty State - No Galleries */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Grid3X3 className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No galleries yet</h3>
              <p className="text-gray-600 mb-8">
                Start creating your first gallery by selecting files from your Dropbox search results.
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-6 py-3 bg-brand-forest text-white rounded-xl hover:bg-brand-olive transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Gallery
              </button>
            </div>
          </div>
        ) : (
          /* Empty State - No Search Results */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No galleries found</h3>
              <p className="text-gray-600 mb-8">
                No galleries match your search "{searchTerm}". Try different keywords or browse all galleries.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center px-6 py-3 bg-brand-forest text-white rounded-xl hover:bg-brand-olive transition-all duration-200 font-medium"
              >
                Show All Galleries
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryList;
