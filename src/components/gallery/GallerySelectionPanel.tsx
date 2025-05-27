import React from 'react';
import { Gallery } from '../../types/gallery';

interface GallerySelectionPanelProps {
  selectedImages: string[];
  onRemove: (path: string) => void;
  onCreate: () => void;
}

const GallerySelectionPanel: React.FC<GallerySelectionPanelProps> = ({ selectedImages, onRemove, onCreate }) => {
  if (selectedImages.length === 0) return null;
  return (
    <aside className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50 flex flex-col">
      <div className="p-4 border-b font-bold text-lg">Selected Images</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {selectedImages.map((img) => (
          <div key={img} className="flex items-center space-x-2">
            <img src={img} alt="Selected" className="w-16 h-16 object-cover rounded" />
            <button onClick={() => onRemove(img)} className="text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <button onClick={onCreate} className="w-full bg-brand-forest text-white py-2 rounded hover:bg-brand-olive transition">Create Gallery</button>
      </div>
    </aside>
  );
};

export default GallerySelectionPanel;
