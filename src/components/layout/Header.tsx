import React from 'react';
import { FileIcon } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FileIcon className="h-8 w-8 text-blue-600" />
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              Dropbox Search
            </h1>
          </div>
          
          <nav className="flex space-x-4">
            <a
              href="https://www.dropbox.com/developers/documentation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Docs
            </a>
            <a
              href="https://github.com/yourusername/dropbox-search"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};
