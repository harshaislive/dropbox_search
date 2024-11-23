import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
}

export default function SearchBar({ query, onQueryChange, onSearch }: SearchBarProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Search files..."
        className="w-full px-4 py-3 pl-12 text-lg rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6b9e45] focus:border-transparent"
      />
      <Search 
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6b9e45]" 
        size={20} 
      />
      <button
        onClick={onSearch}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-[#6b9e45] text-white rounded-md hover:bg-[#5b8a3a] transition-colors"
      >
        Search
      </button>
    </div>
  );
}