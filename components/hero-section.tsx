'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onCommandSearch: (query: string) => void;
  query: string;
  setQuery: (query: string) => void;
  loading: boolean;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  recentSearches: string[];
}

export function HeroSection({
  onSearch,
  onCommandSearch,
  query,
  setQuery,
  loading,
  commandOpen,
  setCommandOpen,
  recentSearches
}: HeroSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setCommandOpen(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <>
      {/* Hero Background */}
      <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#342e29] via-[#002140] to-[#342e29] opacity-95" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#ff774a]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#ffc083]/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#86312b]/5 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
          {/* Logo and Title */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff774a] to-[#86312b] flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-5xl md:text-6xl font-light text-[#fdfbf7] tracking-tight" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
                  Beforest
                </h1>
                <div className="text-sm text-[#ffc083] font-medium tracking-widest uppercase mt-1">
                  Digital Vault
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-light text-[#fdfbf7]/90 mb-2" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
              Discover Your Digital Universe
            </h2>
            <p className="text-lg text-[#fdfbf7]/70 max-w-2xl mx-auto leading-relaxed">
              Search, explore, and experience your Dropbox content like never before. 
              Powered by intelligent discovery and immersive previews.
            </p>
          </div>

          {/* Search Interface */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#ff774a] to-[#ffc083] rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#fdfbf7]/60 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search your files... (Press ⌘K for advanced search)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-16 pl-14 pr-32 text-lg bg-[#fdfbf7]/10 backdrop-blur-xl border-[#fdfbf7]/20 rounded-2xl text-[#fdfbf7] placeholder-[#fdfbf7]/60 focus:bg-[#fdfbf7]/15 focus:border-[#ff774a]/50 transition-all duration-300"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 bg-gradient-to-r from-[#ff774a] to-[#86312b] hover:from-[#86312b] hover:to-[#ff774a] text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Quick Search Suggestions */}
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              <Badge 
                variant="secondary" 
                className="cursor-pointer bg-[#fdfbf7]/10 backdrop-blur-sm border-[#ffc083]/30 text-[#ffc083] hover:bg-[#ffc083]/20 transition-colors px-4 py-2"
                onClick={() => onSearch('type:image')}
              >
                📸 All Images
              </Badge>
              <Badge 
                variant="secondary" 
                className="cursor-pointer bg-[#fdfbf7]/10 backdrop-blur-sm border-[#ff774a]/30 text-[#ff774a] hover:bg-[#ff774a]/20 transition-colors px-4 py-2"
                onClick={() => onSearch('type:video')}
              >
                🎬 Videos
              </Badge>
              <Badge 
                variant="secondary" 
                className="cursor-pointer bg-[#fdfbf7]/10 backdrop-blur-sm border-[#86312b]/30 text-[#86312b] hover:bg-[#86312b]/20 transition-colors px-4 py-2"
                onClick={() => onSearch('type:pdf')}
              >
                📄 Documents
              </Badge>
              <Badge 
                variant="secondary" 
                className="cursor-pointer bg-[#fdfbf7]/10 backdrop-blur-sm border-[#344736]/30 text-[#b8dc99] hover:bg-[#344736]/20 transition-colors px-4 py-2"
                onClick={() => onSearch('.heic')}
              >
                🍎 HEIC Files
              </Badge>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="w-6 h-10 border-2 border-[#fdfbf7]/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-[#ff774a] rounded-full mt-2 animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search your digital universe..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((search) => (
                <CommandItem
                  key={search}
                  onSelect={() => onCommandSearch(search)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span>{search}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Quick Filters">
            <CommandItem onSelect={() => onCommandSearch('type:image')}>
              📸 <span className="ml-2">All Images</span>
            </CommandItem>
            <CommandItem onSelect={() => onCommandSearch('type:video')}>
              🎬 <span className="ml-2">Videos</span>
            </CommandItem>
            <CommandItem onSelect={() => onCommandSearch('type:pdf')}>
              📄 <span className="ml-2">Documents</span>
            </CommandItem>
            <CommandItem onSelect={() => onCommandSearch('.heic')}>
              🍎 <span className="ml-2">HEIC Files</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}