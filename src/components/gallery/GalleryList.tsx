import React, { useEffect, useState } from 'react';
import { Gallery } from '../../types/gallery';
import { listGalleriesWithResolvedImages } from '../../services/galleryApi';
import GalleryCard from './GalleryCard';

const GalleryList: React.FC = () => {
  const [galleries, setGalleries] = useState<any[]>([]); // Accept resolved fields

  useEffect(() => {
    listGalleriesWithResolvedImages().then(({ data }) => {
      if (data) setGalleries(data);
    });
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {galleries.map(gallery => (
        <GalleryCard key={gallery.id} gallery={gallery} />
      ))}
    </div>
  );
};

export default GalleryList;
