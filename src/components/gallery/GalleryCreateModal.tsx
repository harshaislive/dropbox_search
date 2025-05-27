import React, { useState } from 'react';

interface GalleryCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, summary: string) => void;
  defaultTitle?: string;
  defaultSummary?: string;
}

const GalleryCreateModal: React.FC<GalleryCreateModalProps> = ({ open, onClose, onSubmit, defaultTitle = '', defaultSummary = '' }) => {
  const [title, setTitle] = useState(defaultTitle);
  const [summary, setSummary] = useState(defaultSummary);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Create Gallery</h2>
        <label className="block mb-2">
          Title
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 p-2 w-full border rounded" />
        </label>
        <label className="block mb-4">
          Summary
          <textarea value={summary} onChange={e => setSummary(e.target.value)} className="mt-1 p-2 w-full border rounded" />
        </label>
        <div className="flex space-x-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          <button onClick={() => onSubmit(title, summary)} className="px-4 py-2 bg-brand-forest text-white rounded hover:bg-brand-olive">Create</button>
        </div>
      </div>
    </div>
  );
};

export default GalleryCreateModal;
