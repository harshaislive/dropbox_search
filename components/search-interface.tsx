'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, FileText, Image, Video, Folder, File, Download, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export function SearchInterface() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SearchResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const search = useCallback(async (searchQuery: string, searchCursor?: string | null) => {
    if (!searchQuery.trim() && !searchCursor) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCursor) {
        params.append('cursor', searchCursor);
      } else {
        params.append('q', searchQuery);
      }

      const response = await fetch(`/api/search?${params}`);
      const data: SearchResponse = await response.json();

      if (searchCursor) {
        setResults(prev => [...prev, ...data.matches]);
      } else {
        setResults(data.matches);
      }
      
      setCursor(data.cursor || null);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const loadMore = () => {
    if (cursor && !loading) {
      search(query, cursor);
    }
  };

  const getFileIcon = (file: SearchResult) => {
    if (file.isFolder) return <Folder className="w-5 h-5" />;
    
    const ext = file.extension?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="w-5 h-5" />;
    }
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext || '')) {
      return <Video className="w-5 h-5" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePreview = async (file: SearchResult) => {
    setSelectedFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);

    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      setPreviewUrl(data.link);
    } catch (error) {
      console.error('Failed to get preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (file: SearchResult) => {
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      window.open(data.link, '_blank');
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const isPreviewable = (file: SearchResult) => {
    const ext = file.extension?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'webm'].includes(ext || '');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-primary">Beforest Dropbox Search</h1>
          <p className="text-muted-foreground">Search your Dropbox files instantly</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder='Search files... (e.g., "report" or "vacation type:image")'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button 
              type="submit" 
              size="lg"
              disabled={loading || !query.trim()}
              className="px-8"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </form>

        {/* Search Tips */}
        {results.length === 0 && !loading && (
          <div className="text-center text-muted-foreground mb-8">
            <p className="mb-2">Try searching with type filters:</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Badge variant="secondary">photos type:image</Badge>
              <Badge variant="secondary">presentation type:pdf</Badge>
              <Badge variant="secondary">meeting type:video</Badge>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="grid gap-4">
          {loading && results.length === 0 ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : (
            results.map((file) => (
              <Card key={file.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 text-muted-foreground">
                        {getFileIcon(file)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-lg">{file.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{file.path}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          {file.size && <span>{formatFileSize(file.size)}</span>}
                          <span>{formatDate(file.modified)}</span>
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
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <Button onClick={loadMore} variant="outline" size="lg">
              Load More Results
            </Button>
          </div>
        )}

        {loading && results.length > 0 && (
          <div className="mt-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedFile?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : previewUrl ? (
                <div className="space-y-4">
                  {selectedFile?.extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(selectedFile.extension.toLowerCase()) ? (
                    <img 
                      src={previewUrl} 
                      alt={selectedFile.name}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : selectedFile?.extension && ['mp4', 'mov', 'webm'].includes(selectedFile.extension.toLowerCase()) ? (
                    <video 
                      src={previewUrl} 
                      controls
                      className="w-full h-auto rounded-lg"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : null}
                  <div className="flex gap-2 justify-end">
                    <Button onClick={() => window.open(previewUrl, '_blank')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Failed to load preview</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}