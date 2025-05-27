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
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-forest/5 via-brand-olive/5 to-brand-forest/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative glass rounded-2xl shadow-lg border border-brand-softgray/20 overflow-hidden">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 text-brand-charcoal/70">
              <Search size={18} className="transition-colors duration-200 group-focus-within:text-brand-forest" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search your Dropbox files..."
              className="flex-1 h-12 px-0 py-0 text-base font-body text-brand-charcoal placeholder-brand-charcoal/50 bg-transparent border-0 focus:outline-none focus:ring-0"
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={onSearch}
                className="group/btn flex items-center justify-center px-4 h-8 mx-3 bg-brand-forest text-brand-offwhite text-sm font-medium rounded-full hover:bg-brand-olive transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-forest focus:ring-offset-2 focus:ring-offset-transparent"
              >
                <span className="transition-transform duration-200 group-hover/btn:scale-105">
                  Search
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Search suggestions hint */}
      {!query && (
        <div className="mt-3 text-center">
          <p className="text-xs text-brand-charcoal/50 font-body">
            Try searching for "presentation", "invoice", or file types like "pdf"
          </p>
        </div>
      )}
    </div>
  );
}