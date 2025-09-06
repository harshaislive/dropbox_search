'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Image, Video, FileText, Folder, Search,
  Sparkles, Camera, Film, FileIcon, Apple
} from 'lucide-react';
import { toast } from 'sonner';
import { SetupInstructions } from '@/components/setup-instructions';
import { HeroSection } from '@/components/hero-section';
import { ContentCarousel } from '@/components/content-carousel';
import { ImmersivePreview } from '@/components/immersive-preview';
import { processHeicThumbnail, isHeicFile } from '@/lib/heic-processor';

interface SearchResult {
  id: string;
  name: string;
  path: string;
  size?: number;
  isFolder: boolean;
  modified: string;
  tag: string;
  extension?: string;
}

interface SearchResponse {
  matches: SearchResult[];
  hasMore: boolean;
  cursor?: string;
}

export function ImmersiveSearchInterface() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SearchResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({});

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const search = useCallback(async (searchQuery: string, searchCursor?: string | null) => {
    if (!searchQuery.trim() && !searchCursor) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCursor) {
        params.append('cursor', searchCursor);
      } else {
        params.append('q', searchQuery);
        saveRecentSearch(searchQuery);
      }

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      // Handle API errors
      if (!response.ok) {
        if (data.error === 'MISSING_CREDENTIALS') {
          setSetupNeeded(true);
          setErrorMessage(data.message);
          toast.error('Dropbox credentials not configured');
          return;
        }
        
        if (data.error === 'INVALID_CREDENTIALS') {
          setSetupNeeded(true);
          setErrorMessage(data.message);
          toast.error('Invalid Dropbox credentials');
          return;
        }
        
        throw new Error(data.message || 'Search failed');
      }

      const searchResults = data as SearchResponse;
      const matches = searchResults.matches || [];

      if (searchCursor) {
        setResults(prev => {
          const existingPaths = new Set(prev.map(file => file.path));
          const newUniqueMatches = matches.filter(match => !existingPaths.has(match.path));
          return [...prev, ...newUniqueMatches];
        });
      } else {
        setResults(matches);
        setSetupNeeded(false);
        setErrorMessage(null);
      }
      
      setCursor(searchResults.cursor || null);
      setHasMore(searchResults.hasMore || false);
      
      toast.success(`Found ${matches.length} results`);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (searchQuery: string) => {
    search(searchQuery);
  };

  const handleCommandSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setCommandOpen(false);
    search(searchQuery);
  };

  const handlePreview = async (file: SearchResult) => {
    setSelectedFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);

    try {
      // For HEIC files, use client-side processing
      if (isHeicFile(file.extension)) {
        try {
          const heicThumbnail = await processHeicThumbnail(file.path, 1024, 0.95);
          setPreviewUrl(heicThumbnail);
          setPreviewLoading(false);
          return;
        } catch (heicError) {
          console.warn('HEIC preview processing failed, falling back to download link:', heicError);
        }
      }

      // For all other files, try high quality thumbnail first
      const isImageOrVideo = file.extension && (
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm', 'mp4', 'mov', 'avi', 'webm', 'mkv'].includes(file.extension.toLowerCase())
      );

      if (isImageOrVideo) {
        try {
          const response = await fetch(`/api/thumbnail?path=${encodeURIComponent(file.path)}&size=w1024h768`);
          if (response.ok) {
            const data = await response.json();
            setPreviewUrl(data.thumbnailUrl);
            setPreviewLoading(false);
            return;
          }
        } catch (error) {
          console.warn('High quality thumbnail failed, falling back to download link:', error);
        }
      }

      // Fallback to download link for direct viewing
      const response = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      setPreviewUrl(data.link);
      
    } catch (error) {
      console.error('Failed to get preview:', error);
      toast.error('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (file: SearchResult) => {
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      window.open(data.link, '_blank');
      toast.success(`Downloading ${file.name}`);
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Download failed');
    }
  };

  // Categorize results
  const categorizeResults = (allResults: SearchResult[]) => {
    const images = allResults.filter(file => {
      const ext = file.extension?.toLowerCase();
      return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm'].includes(ext);
    });

    const heicFiles = allResults.filter(file => {
      const ext = file.extension?.toLowerCase();
      return ext && ['heic', 'heif'].includes(ext);
    });

    const videos = allResults.filter(file => {
      const ext = file.extension?.toLowerCase();
      return ext && ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);
    });

    const documents = allResults.filter(file => {
      const ext = file.extension?.toLowerCase();
      return ext && ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext);
    });

    const folders = allResults.filter(file => file.isFolder);

    const other = allResults.filter(file => 
      !images.some(img => img.id === file.id) &&
      !heicFiles.some(heic => heic.id === file.id) &&
      !videos.some(vid => vid.id === file.id) &&
      !documents.some(doc => doc.id === file.id) &&
      !folders.some(folder => folder.id === file.id)
    );

    return { images, heicFiles, videos, documents, folders, other };
  };

  const { images, heicFiles, videos, documents, folders, other } = categorizeResults(results);

  // Show setup instructions if credentials are missing
  if (setupNeeded) {
    return <SetupInstructions errorMessage={errorMessage || undefined} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <HeroSection
        onSearch={handleSearch}
        onCommandSearch={handleCommandSearch}
        query={query}
        setQuery={setQuery}
        loading={loading}
        commandOpen={commandOpen}
        setCommandOpen={setCommandOpen}
        recentSearches={recentSearches}
      />

      {/* Content Discovery Section */}
      {results.length > 0 && (
        <div className="py-12 space-y-4">
          {/* Images */}
          {images.length > 0 && (
            <ContentCarousel
              title="Image Gallery"
              description="Your visual content collection"
              icon={<Camera className="w-6 h-6" />}
              accentColor="#10b981"
              results={images}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onThumbnailLoaded={(filePath: string, thumbnailUrl: string) => {
                setThumbnailCache(prev => ({ ...prev, [filePath]: thumbnailUrl }));
              }}
            />
          )}

          {/* HEIC Files */}
          {heicFiles.length > 0 && (
            <ContentCarousel
              title="HEIC Collection"
              description="Apple's high-efficiency image format"
              icon={<Apple className="w-6 h-6" />}
              accentColor="#ff774a"
              results={heicFiles}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onThumbnailLoaded={(filePath: string, thumbnailUrl: string) => {
                setThumbnailCache(prev => ({ ...prev, [filePath]: thumbnailUrl }));
              }}
            />
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <ContentCarousel
              title="Video Library"
              description="Your multimedia content"
              icon={<Film className="w-6 h-6" />}
              accentColor="#8b5cf6"
              results={videos}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onThumbnailLoaded={(filePath: string, thumbnailUrl: string) => {
                setThumbnailCache(prev => ({ ...prev, [filePath]: thumbnailUrl }));
              }}
            />
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <ContentCarousel
              title="Documents"
              description="Your important files and papers"
              icon={<FileText className="w-6 h-6" />}
              accentColor="#ef4444"
              results={documents}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          )}

          {/* Folders */}
          {folders.length > 0 && (
            <ContentCarousel
              title="Folders"
              description="Organize your content"
              icon={<Folder className="w-6 h-6" />}
              accentColor="#3b82f6"
              results={folders}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          )}

          {/* Other Files */}
          {other.length > 0 && (
            <ContentCarousel
              title="Other Files"
              description="Additional content"
              icon={<FileIcon className="w-6 h-6" />}
              accentColor="#6b7280"
              results={other}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !loading && query && (
        <div className="py-20 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#ff774a]/20 to-[#86312b]/20 flex items-center justify-center">
              <Search className="w-10 h-10 text-[#ff774a]" />
            </div>
            <h3 className="text-2xl font-light text-foreground" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
              No results found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or explore different file types
            </p>
          </div>
        </div>
      )}

      {/* Welcome State */}
      {results.length === 0 && !loading && !query && (
        <div className="py-20 text-center">
          <div className="max-w-lg mx-auto space-y-8">
            <div className="flex justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/10 flex items-center justify-center">
                <Image className="w-8 h-8 text-[#10b981]" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#8b5cf6]/10 flex items-center justify-center">
                <Video className="w-8 h-8 text-[#8b5cf6]" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-[#ef4444]" />
              </div>
            </div>
            <h3 className="text-2xl font-light text-foreground" style={{ fontFamily: 'ABC Arizona Flare, serif' }}>
              Ready to explore your digital universe?
            </h3>
            <p className="text-muted-foreground">
              Start by searching for your files above, or try one of the quick search suggestions
            </p>
          </div>
        </div>
      )}

      {/* Immersive Preview */}
      <ImmersivePreview
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        previewUrl={previewUrl}
        loading={previewLoading}
        onDownload={handleDownload}
      />
    </div>
  );
}