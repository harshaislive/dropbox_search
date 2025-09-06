'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Search, Loader2, FileText, Image, Video, Folder, File, 
  Download, Eye, Grid3x3, List, Filter, Clock, ArrowUpDown,
  CheckCircle2, XCircle, AlertCircle, LayoutGrid, Rows3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { SetupInstructions } from '@/components/setup-instructions';
import { FileThumbnail } from '@/components/file-thumbnail';
import { HoverPreview } from '@/components/hover-preview';
import { MediaGrid } from '@/components/media-grid';
import { ImmersiveMediaGrid } from '@/components/immersive-media-grid';
import { processHeicThumbnail, isHeicFile } from '@/lib/heic-processor';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

type ViewMode = 'cards' | 'grid' | 'immersive' | 'table';
type FileType = 'image' | 'video';

export function EnhancedSearchInterface() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SearchResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('immersive');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileType>('image');
  const [commandOpen, setCommandOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // Removed file selection - individual downloads provide better UX
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({});
  const [filterChanged, setFilterChanged] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close modal
      if (e.key === 'Escape' && selectedFile) {
        setSelectedFile(null);
      }
      
      // ESC to close command palette
      if (e.key === 'Escape' && commandOpen) {
        setCommandOpen(false);
      }
      
      // Arrow keys for modal navigation (if we have multiple files)
      if (selectedFile && results.length > 1) {
        const currentIndex = results.findIndex(f => f.id === selectedFile.id);
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          handlePreview(results[currentIndex - 1]);
        }
        
        if (e.key === 'ArrowRight' && currentIndex < results.length - 1) {
          e.preventDefault();
          handlePreview(results[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, commandOpen, results]);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const search = useCallback(async (searchQuery: string, searchCursor?: string | null) => {
    if (!searchQuery.trim() && !searchCursor) return;

    setLoading(true);
    try {
      // Add file type filter to query
      let finalQuery = searchQuery;
      if (!searchQuery.includes('type:')) {
        finalQuery = `${searchQuery} type:${fileTypeFilter}`;
      }

      const params = new URLSearchParams();
      if (searchCursor) {
        params.append('cursor', searchCursor);
      } else {
        params.append('q', finalQuery);
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

      // Ensure data has the expected structure
      const searchResults = data as SearchResponse;
      const matches = searchResults.matches || [];

      if (searchCursor) {
        // When loading more results, filter out any duplicates based on path
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
    } catch (error: unknown) {
      console.error('Search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fileTypeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterChanged(false); // Reset filter change state when searching
    search(query);
  };

  const handleCommandSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setCommandOpen(false);
    search(searchQuery);
  };

  const loadMore = () => {
    if (cursor && !loading) {
      search(query, cursor);
    }
  };

  const getFileIcon = (file: SearchResult) => {
    if (file.isFolder) return <Folder className="w-5 h-5" />;
    
    const ext = file.extension?.toLowerCase();
    // Exclude non-image files that might be misclassified as images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'tiff', 'tif', 'bmp', 'ppm'];
    const nonImageExtensions = ['ai', 'eps', 'ps', 'psd', 'sketch', 'fig', 'xd', 'indd', 'dwg', 'dxf'];
    
    if (imageExtensions.includes(ext || '') && !nonImageExtensions.includes(ext || '')) {
      return <Image className="w-5 h-5 text-green-600" />;
    }
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '')) {
      return <Video className="w-5 h-5 text-purple-600" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePreview = async (file: SearchResult) => {
    setSelectedFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);

    try {
      // For HEIC files, use client-side processing
      if (isHeicFile(file.extension)) {
        try {
          // Get high quality HEIC thumbnail for preview (1024px)
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
          // Try high quality thumbnail for preview
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
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = data.link;
      link.download = file.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading ${file.name}`);
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Download failed');
    }
  };

  // Removed bulk download - individual downloads provide better UX

  const isPreviewable = (file: SearchResult) => {
    const ext = file.extension?.toLowerCase();
    // Exclude non-image files that might be misclassified as images
    const previewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'mp4', 'mov', 'webm'];
    const nonImageExtensions = ['ai', 'eps', 'ps', 'psd', 'sketch', 'fig', 'xd', 'indd', 'dwg', 'dxf'];
    
    return previewableExtensions.includes(ext || '') && !nonImageExtensions.includes(ext || '');
  };

  const isValidMediaFile = (file: SearchResult) => {
    const ext = file.extension?.toLowerCase();
    // Filter out design files that Dropbox incorrectly categorizes as images
    const excludedExtensions = ['ai', 'eps', 'ps', 'psd', 'sketch', 'fig', 'xd', 'indd', 'dwg', 'dxf'];
    return !excludedExtensions.includes(ext || '');
  };

  // Filter results to exclude design files
  const filteredResults = results.filter(isValidMediaFile);

  // Removed file selection functionality

  // Show setup instructions if credentials are missing
  if (setupNeeded) {
    return <SetupInstructions errorMessage={errorMessage || undefined} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header and Search - Constrained Container */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center">
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4">
            <img 
              src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png" 
              alt="Beforest Logo"
              className="h-8 md:h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Vector Media Search
          </h1>
          <p className="text-sm md:text-base text-muted-foreground px-4">Advanced file search with AI-powered filters</p>
        </div>

        {/* Search Bar with Filters */}
        <div className="mb-6 md:mb-8 space-y-3 md:space-y-4 px-2 md:px-0">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
              <Input
                type="text"
                placeholder='Search files...'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 md:pl-10 h-11 md:h-12 text-base md:text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    setCommandOpen(true);
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2 sm:gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="flex-1 sm:flex-none">
                    <Filter className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{fileTypeFilter === 'image' ? 'Images' : 'Videos'}</span>
                    <span className="sm:hidden">{fileTypeFilter === 'image' ? 'Img' : 'Vid'}</span>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Media Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={fileTypeFilter === 'image'}
                  onCheckedChange={() => {
                    setFileTypeFilter('image');
                    setFilterChanged(true);
                  }}
                >
                  Images
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={fileTypeFilter === 'video'}
                  onCheckedChange={() => {
                    setFileTypeFilter('video');
                    setFilterChanged(true);
                  }}
                >
                  Videos
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

              <Button 
                type="submit" 
                size="default"
                disabled={loading || !query.trim()}
                className={`px-4 md:px-8 transition-all duration-300 flex-1 sm:flex-none ${
                  filterChanged && query.trim() 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg ring-2 ring-orange-200 animate-pulse' 
                    : ''
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : filterChanged && query.trim() ? (
                  'Search Again'
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </form>

          {/* View Toggle */}
          {filteredResults.length > 0 && (
            <div className="flex justify-between items-center max-w-3xl mx-auto">
              <div className="text-sm text-muted-foreground">
                {filteredResults.length} results found
              </div>
              <div className="flex gap-2">
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                  <ToggleGroupItem value="immersive" aria-label="Immersive view">
                    <LayoutGrid className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid3x3 className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="cards" aria-label="Card view">
                    <List className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view">
                    <Rows3 className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results - Full Width Section */}
      {loading && filteredResults.length === 0 ? (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid gap-4 max-w-3xl mx-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : viewMode === 'immersive' ? (
          <ImmersiveMediaGrid 
            results={filteredResults}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onThumbnailLoaded={(filePath: string, thumbnailUrl: string) => {
              setThumbnailCache(prev => ({ ...prev, [filePath]: thumbnailUrl }));
            }}
          />
        ) : viewMode === 'grid' ? (
          <MediaGrid 
            results={filteredResults}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onThumbnailLoaded={(filePath: string, thumbnailUrl: string) => {
              setThumbnailCache(prev => ({ ...prev, [filePath]: thumbnailUrl }));
            }}
          />
        ) : viewMode === 'cards' ? (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid gap-4 max-w-3xl mx-auto">
            {filteredResults.map((file) => (
              <HoverPreview
                key={file.id}
                file={file}
                onPreview={() => handlePreview(file)}
                onDownload={() => handleDownload(file)}
              >
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileThumbnail file={file} size="md" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-lg">{file.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{file.path}</p>
                          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            {file.size && <span>{formatFileSize(file.size)}</span>}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(file.modified)}
                            </span>
                            {file.extension && (
                              <Badge variant="outline" className="text-xs">
                                {file.extension.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {!file.isFolder && (
                        <div className="flex gap-2">
                          {isPreviewable(file) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(file)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </HoverPreview>
            ))}
          </div>
        </div>
        ) : (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-6xl mx-auto">
            <ScrollArea className="h-[600px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileThumbnail file={file} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{file.path}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {file.extension ? (
                          <Badge variant="outline">{file.extension.toUpperCase()}</Badge>
                        ) : (
                          <Badge variant="outline">Folder</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>{formatDate(file.modified)}</TableCell>
                      <TableCell className="text-right">
                        {!file.isFolder && (
                          <div className="flex gap-2 justify-end">
                            {isPreviewable(file) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePreview(file)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
        )}

      {/* Empty State - Only show when not in grid/immersive view since those components have their own empty state */}
      {filteredResults.length === 0 && !loading && viewMode !== 'grid' && viewMode !== 'immersive' && (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Discover the Beauty</h3>
            <p className="text-muted-foreground mb-4">Start searching to explore the stunning visual world of Beforest Collectives and our vibrant ecoverse</p>
          </div>
        </div>
        )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mt-8 text-center">
            <Button 
              onClick={loadMore} 
              size="lg"
              className="bg-gradient-to-r from-[#86312b] to-[#ff774a] hover:from-[#9e3430] hover:to-[#ff774a] text-white font-medium tracking-wide transition-all duration-300 transform hover:scale-105 hover:shadow-lg border-0 px-8 py-3 text-sm uppercase"
              style={{ fontFamily: 'ABC Arizona Flare, serif' }}
            >
              Load More Results
            </Button>
          </div>
        </div>
        )}

      {loading && filteredResults.length > 0 && (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mt-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        </div>
        )}

        {/* Command Palette */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Type to search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {recentSearches.length > 0 && (
              <>
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search) => (
                    <CommandItem
                      key={search}
                      onSelect={() => handleCommandSearch(search)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Quick Filters">
              <CommandItem onSelect={() => handleCommandSearch('type:image')}>
                <Image className="mr-2 h-4 w-4" />
                <span>Search Images</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSearch('type:video')}>
                <Video className="mr-2 h-4 w-4" />
                <span>Search Videos</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSearch('type:pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Search PDFs</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSearch('type:document')}>
                <File className="mr-2 h-4 w-4" />
                <span>Search Documents</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* Preview Dialog */}
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedFile && getFileIcon(selectedFile)}
                {selectedFile?.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Preview of {selectedFile?.name}. {selectedFile?.extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'].includes(selectedFile.extension.toLowerCase()) ? 'Image preview' : selectedFile?.extension && ['mp4', 'mov', 'webm'].includes(selectedFile.extension.toLowerCase()) ? 'Video preview with playback controls' : 'File preview'}
              </DialogDescription>
              {results.length > 1 && (
                <div className="text-xs text-muted-foreground mt-1 text-center bg-muted/50 rounded-md px-3 py-1">
                  Press ← → to navigate • ESC to close
                </div>
              )}
            </DialogHeader>
            <div className="mt-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : previewUrl ? (
                <div className="space-y-4">
                  {selectedFile?.extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'].includes(selectedFile.extension.toLowerCase()) ? (
                    <img 
                      src={previewUrl} 
                      alt={selectedFile.name}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : selectedFile?.extension && ['mp4', 'mov', 'webm'].includes(selectedFile.extension.toLowerCase()) ? (
                    <div className="space-y-2">
                      <video 
                        src={previewUrl} 
                        controls
                        autoPlay={false}
                        preload="metadata"
                        className="w-full h-auto rounded-lg"
                        onError={(e) => {
                          console.error('Video playback error:', e);
                          console.error('Video URL:', previewUrl);
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started:', previewUrl);
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <p className="text-xs text-muted-foreground text-center">
                        If video doesn&apos;t play, try downloading it instead. Some video formats may not be supported in browser preview.
                      </p>
                    </div>
                  ) : null}
                  <Separator />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Size: {formatFileSize(selectedFile?.size)}</span>
                    <span>Modified: {selectedFile && formatDate(selectedFile.modified)}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setSelectedFile(null)}>
                      Close
                    </Button>
                    <Button onClick={() => selectedFile && handleDownload(selectedFile)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Failed to load preview</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <footer className="mt-16 pb-8">
          <div className="text-center text-sm text-muted-foreground">
            Made with ❤️ by BI for team Beforest
          </div>
        </footer>
    </div>
  );
}