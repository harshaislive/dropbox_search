'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  CalendarDays,
  Download,
  ExternalLink,
  File,
  FileText,
  Folder,
  Image as ImageIcon,
  Info,
  Loader2,
  LogOut,
  Plus,
  Search,
  Tag,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FileCategory =
  | 'image'
  | 'video'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'audio'
  | 'folder'
  | 'others';

type SearchResult = {
  id: string;
  dropboxId?: string;
  name: string;
  path: string;
  pathLower?: string;
  size?: number;
  isFolder: boolean;
  modified: string;
  serverModified?: string;
  tag: string;
  extension?: string;
  contentHash?: string;
  dimensions?: { height?: number; width?: number };
  mediaType?: string;
  matchType?: string;
};

type Collection = {
  id: string;
  name: string;
  createdAt: string;
  items: SearchResult[];
};

type Metadata = {
  id?: string;
  name: string;
  path: string;
  size?: number;
  tag: string;
  extension?: string;
  clientModified?: string;
  serverModified?: string;
  contentHash?: string;
  isDownloadable?: boolean;
  dimensions?: { height?: number; width?: number };
  mediaType?: string;
  timeTaken?: string;
};

const categoryOptions: Array<{ value: FileCategory; label: string }> = [
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'document', label: 'Docs' },
  { value: 'spreadsheet', label: 'Sheets' },
  { value: 'presentation', label: 'Decks' },
  { value: 'audio', label: 'Audio' },
  { value: 'folder', label: 'Folders' },
  { value: 'others', label: 'Other' },
];

const quickSearches = [
  'drone',
  'people working',
  'food',
  'collective',
  'poomaale',
  'bhopal',
  'farm',
  'stay',
];

const thumbnailExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm']);
const previewImageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'tiff', 'tif', 'bmp']);
const videoExtensions = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']);

function formatFileSize(bytes?: number) {
  if (!bytes) return 'Folder';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${sizes[index]}`;
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fileIcon(file: SearchResult, className?: string) {
  if (file.isFolder) return <Folder className={cn('text-muted-foreground', className)} />;
  const ext = file.extension?.toLowerCase();
  if (ext && previewImageExtensions.has(ext)) return <ImageIcon className={cn('text-muted-foreground', className)} />;
  if (ext && videoExtensions.has(ext)) return <Video className={cn('text-muted-foreground', className)} />;
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return <FileText className={cn('text-muted-foreground', className)} />;
  return <File className={cn('text-muted-foreground', className)} />;
}

function collectionSeed(): Collection[] {
  return [
    {
      id: 'default-shortlist',
      name: 'Campaign shortlist',
      createdAt: new Date().toISOString(),
      items: [],
    },
  ];
}

export function MediaLibrary() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FileCategory>('image');
  const [extensions, setExtensions] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [orderBy, setOrderBy] = useState<'relevance' | 'last_modified_time'>('relevance');
  const [filenameOnly, setFilenameOnly] = useState(false);
  const [datePreset, setDatePreset] = useState<'any' | '7d' | '30d' | '90d'>('any');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [folderEntries, setFolderEntries] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<SearchResult | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>(collectionSeed);
  const [activeCollectionId, setActiveCollectionId] = useState('default-shortlist');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagsByPath, setTagsByPath] = useState<Record<string, string[]>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const activeCollection = collections.find(collection => collection.id === activeCollectionId) || collections[0];

  const modifiedAfter = useMemo(() => {
    if (datePreset === 'any') return '';
    const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }, [datePreset]);

  const breadcrumb = useMemo(() => {
    if (!folderPath) return [{ label: 'Dropbox', path: '' }];
    const parts = folderPath.split('/').filter(Boolean);
    return [
      { label: 'Dropbox', path: '' },
      ...parts.map((part, index) => ({
        label: part,
        path: `/${parts.slice(0, index + 1).join('/')}`,
      })),
    ];
  }, [folderPath]);

  useEffect(() => {
    const savedCollections = localStorage.getItem('mediaCollections:v1');
    const savedTags = localStorage.getItem('mediaTags:v1');

    if (savedCollections) {
      setCollections(JSON.parse(savedCollections));
    }

    if (savedTags) {
      setTagsByPath(JSON.parse(savedTags));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mediaCollections:v1', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('mediaTags:v1', JSON.stringify(tagsByPath));
  }, [tagsByPath]);

  const loadFolder = useCallback(async (path: string) => {
    setFolderLoading(true);

    try {
      const response = await fetch(`/api/folders?path=${encodeURIComponent(path)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Folder load failed');
      }

      setFolderEntries(data.entries || []);
    } catch (error) {
      console.error('Folder load failed:', error);
      toast.error('Could not load Dropbox folder');
    } finally {
      setFolderLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolder(folderPath);
  }, [folderPath, loadFolder]);

  const hydrateThumbnails = useCallback(async (files: SearchResult[]) => {
    const paths = files
      .filter(file => {
        const ext = file.extension?.toLowerCase();
        return !file.isFolder && ext && thumbnailExtensions.has(ext) && !thumbnails[file.path];
      })
      .slice(0, 25)
      .map(file => file.path);

    if (!paths.length) return;

    try {
      const response = await fetch('/api/thumbnails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, size: 'w480h320' }),
      });
      const data = await response.json();

      if (response.ok && data.thumbnails) {
        setThumbnails(prev => ({ ...prev, ...data.thumbnails }));
      }
    } catch (error) {
      console.warn('Batch thumbnail load failed:', error);
    }
  }, [thumbnails]);

  useEffect(() => {
    hydrateThumbnails(results);
  }, [results, hydrateThumbnails]);

  const runSearch = useCallback(async (nextCursor?: string | null, queryOverride?: string) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (nextCursor) {
        params.set('cursor', nextCursor);
      } else {
        params.set('q', queryOverride?.trim() || query.trim() || '*');
        params.set('categories', category);
        params.set('path', folderPath);
        params.set('orderBy', orderBy);
        params.set('filenameOnly', String(filenameOnly));
        params.set('maxResults', '48');

        if (extensions.trim()) {
          params.set('extensions', extensions);
        }

        if (modifiedAfter) {
          params.set('modifiedAfter', modifiedAfter);
        }
      }

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Search failed');
      }

      const matches = data.matches || [];

      if (nextCursor) {
        setResults(prev => {
          const paths = new Set(prev.map(file => file.path));
          return [...prev, ...matches.filter((file: SearchResult) => !paths.has(file.path))];
        });
      } else {
        setResults(matches);
      }

      setCursor(data.cursor || null);
      setHasMore(Boolean(data.hasMore));
      toast.success(`${matches.length} result${matches.length === 1 ? '' : 's'} loaded`);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [category, extensions, filenameOnly, folderPath, modifiedAfter, orderBy, query]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    runSearch();
  };

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && cursor) {
          runSearch(cursor);
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading, runSearch]);

  const openDetails = async (file: SearchResult) => {
    setSelectedFile(file);
    setMetadata(null);
    setPreviewUrl(thumbnails[file.path] || null);
    setDetailLoading(true);

    try {
      const [metadataResponse, previewResponse] = await Promise.allSettled([
        fetch(`/api/metadata?path=${encodeURIComponent(file.path)}`),
        fetch(`/api/preview?path=${encodeURIComponent(file.path)}`),
      ]);

      if (metadataResponse.status === 'fulfilled' && metadataResponse.value.ok) {
        setMetadata(await metadataResponse.value.json());
      }

      if (!thumbnails[file.path] && previewResponse.status === 'fulfilled' && previewResponse.value.ok) {
        const data = await previewResponse.value.json();
        setPreviewUrl(data.previewUrl);
      }
    } catch (error) {
      console.error('Details load failed:', error);
      toast.error('Could not load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDropboxLink = async (file: SearchResult) => {
    try {
      const response = await fetch(`/api/open-link?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not create link');
      window.open(data.link, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open Dropbox link');
    }
  };

  const downloadFile = async (file: SearchResult) => {
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Download link failed');

      const link = document.createElement('a');
      link.href = data.link;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  const addToCollection = (file: SearchResult) => {
    setCollections(prev => prev.map(collection => {
      if (collection.id !== activeCollection.id) return collection;
      if (collection.items.some(item => item.path === file.path)) return collection;
      return { ...collection, items: [file, ...collection.items] };
    }));
    toast.success(`Added to ${activeCollection.name}`);
  };

  const createCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;

    const collection = {
      id: `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      items: [],
    };

    setCollections(prev => [collection, ...prev]);
    setActiveCollectionId(collection.id);
    setNewCollectionName('');
  };

  const addTag = () => {
    if (!selectedFile || !tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase();

    setTagsByPath(prev => {
      const existing = prev[selectedFile.path] || [];
      if (existing.includes(tag)) return prev;
      return { ...prev, [selectedFile.path]: [...existing, tag] };
    });
    setTagInput('');
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-[#fdfbf7]/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png"
              alt="Beforest"
              className="h-9 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-light leading-none">Media Library</h1>
              <p className="text-sm italic text-muted-foreground">Search, shortlist, and return to the right asset.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[280px_1fr_300px]">
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Folder />
                Folder Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1">
                {breadcrumb.map(crumb => (
                  <Button
                    key={crumb.path || 'root'}
                    type="button"
                    variant={crumb.path === folderPath ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFolderPath(crumb.path)}
                    className="h-7 px-2"
                  >
                    {crumb.label}
                  </Button>
                ))}
              </div>
              <ScrollArea className="h-[320px] rounded-md border">
                <div className="flex flex-col p-2">
                  {folderLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="mb-2 h-8" />
                    ))
                  ) : folderEntries.filter(entry => entry.isFolder).length ? (
                    folderEntries.filter(entry => entry.isFolder).map(folder => (
                      <button
                        key={folder.path}
                        type="button"
                        onClick={() => setFolderPath(folder.path)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                      >
                        <Folder className="shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">No folders here.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Archive />
                Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  value={newCollectionName}
                  onChange={event => setNewCollectionName(event.target.value)}
                  placeholder="New collection"
                />
                <Button type="button" size="icon" onClick={createCollection}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                {collections.map(collection => (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setActiveCollectionId(collection.id)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted',
                      collection.id === activeCollectionId && 'bg-muted'
                    )}
                  >
                    <span className="truncate">{collection.name}</span>
                    <Badge variant="secondary">{collection.items.length}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder="Search Dropbox assets"
                      className="pl-9"
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Search />}
                    Search
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map(option => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={category === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategory(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_160px_180px_150px]">
                  <Input
                    value={extensions}
                    onChange={event => setExtensions(event.target.value)}
                    placeholder="Extensions: jpg,png,mp4"
                  />
                  <select
                    value={orderBy}
                    onChange={event => setOrderBy(event.target.value as 'relevance' | 'last_modified_time')}
                    className="h-9 rounded-md border bg-[#fffdf9] px-3 text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="last_modified_time">Newest first</option>
                  </select>
                  <select
                    value={datePreset}
                    onChange={event => setDatePreset(event.target.value as 'any' | '7d' | '30d' | '90d')}
                    className="h-9 rounded-md border bg-[#fffdf9] px-3 text-sm"
                  >
                    <option value="any">Any date</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                  <Button
                    type="button"
                    variant={filenameOnly ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setFilenameOnly(value => !value)}
                  >
                    Filename only
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickSearches.map(searchTerm => (
                    <Button
                      key={searchTerm}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery(searchTerm);
                        runSearch(null, searchTerm);
                      }}
                    >
                      {searchTerm}
                    </Button>
                  ))}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Search results'}
              {folderPath ? ` in ${folderPath}` : ''}
            </div>
            {hasMore && (
              <Button variant="outline" size="sm" onClick={() => runSearch(cursor)} disabled={loading}>
                Load more
              </Button>
            )}
          </div>

          {loading && !results.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton key={index} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : results.length ? (
            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(file => (
                <Card key={`${file.id}-${file.path}`} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openDetails(file)}
                    className="block w-full text-left"
                  >
                    <div className="aspect-square bg-muted">
                      {thumbnails[file.path] ? (
                        <img
                          src={thumbnails[file.path]}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          {fileIcon(file, 'size-10')}
                        </div>
                      )}
                    </div>
                    <CardContent className="flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium">{file.name}</h3>
                          <p className="truncate text-xs text-muted-foreground">{file.path}</p>
                        </div>
                        {file.extension && <Badge variant="outline">{file.extension.toUpperCase()}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays />
                          {formatDate(file.serverModified || file.modified)}
                        </span>
                      </div>
                      {tagsByPath[file.path]?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {tagsByPath[file.path].map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </button>
                  <div className="flex gap-2 px-3 pb-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => addToCollection(file)}>
                      <Plus />
                      Shortlist
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => downloadFile(file)}>
                      <Download />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openDropboxLink(file)}>
                      <ExternalLink />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="text-muted-foreground" />
                <h2 className="font-medium">Start with a search or pick a folder.</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Use folder scope, file category, extension, and date filters to cut through Dropbox faster.
                </p>
              </CardContent>
            </Card>
          )}
          <div ref={loadMoreRef} className="h-8" />
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{activeCollection.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[360px]">
                <div className="flex flex-col gap-2">
                  {activeCollection.items.length ? (
                    activeCollection.items.map(file => (
                      <button
                        key={`${activeCollection.id}-${file.path}`}
                        type="button"
                        onClick={() => openDetails(file)}
                        className="flex items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
                      >
                        {fileIcon(file)}
                        <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Shortlisted assets will appear here.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info />
                API Surface Added
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <code>/api/folders</code>
              <code>/api/search</code>
              <code>/api/thumbnails/batch</code>
              <code>/api/metadata</code>
              <code>/api/preview</code>
              <code>/api/open-link</code>
            </CardContent>
          </Card>
        </aside>
      </main>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && fileIcon(selectedFile)}
              {selectedFile?.name}
            </DialogTitle>
            <DialogDescription>{selectedFile?.path}</DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-lg bg-muted">
                {detailLoading && !previewUrl ? (
                  <div className="flex aspect-video items-center justify-center">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : previewUrl && selectedFile.extension && previewImageExtensions.has(selectedFile.extension.toLowerCase()) ? (
                  <img src={previewUrl} alt={selectedFile.name} className="max-h-[70vh] w-full rounded-lg object-contain" />
                ) : previewUrl && selectedFile.extension && videoExtensions.has(selectedFile.extension.toLowerCase()) ? (
                  <video src={previewUrl} controls className="max-h-[70vh] w-full rounded-lg" />
                ) : (
                  <div className="flex aspect-video items-center justify-center">
                    {fileIcon(selectedFile, 'size-12')}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => addToCollection(selectedFile)}>
                    <Plus />
                    Add
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => downloadFile(selectedFile)}>
                    <Download />
                    Download
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openDropboxLink(selectedFile)}>
                    <ExternalLink />
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Size</span>
                    <span>{formatFileSize(metadata?.size || selectedFile.size)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Modified</span>
                    <span>{formatDate(metadata?.serverModified || selectedFile.serverModified || selectedFile.modified)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Type</span>
                    <span>{metadata?.extension || selectedFile.extension || selectedFile.tag}</span>
                  </div>
                  {(metadata?.dimensions || selectedFile.dimensions) && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Dimensions</span>
                      <span>
                        {(metadata?.dimensions || selectedFile.dimensions)?.width} x {(metadata?.dimensions || selectedFile.dimensions)?.height}
                      </span>
                    </div>
                  )}
                  {(metadata?.contentHash || selectedFile.contentHash) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Content hash</span>
                      <code className="break-all rounded-md bg-muted px-2 py-1 text-xs">{metadata?.contentHash || selectedFile.contentHash}</code>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tag />
                    Local tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(tagsByPath[selectedFile.path] || []).map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={event => setTagInput(event.target.value)} placeholder="Add tag" />
                    <Button type="button" size="sm" onClick={addTag}>Add</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
