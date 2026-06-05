'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
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
  SlidersHorizontal,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const defaultQuickSearches = [
  'drone',
  'people working',
  'food',
  'collective',
  'poomaale',
  'bhopal',
  'farm',
  'stay',
];

const videoExtensions = new Set(['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv']);
const thumbnailExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'ppm', ...videoExtensions]);
const previewImageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif', 'tiff', 'tif', 'bmp']);
const ignoredQuickFindWords = new Set([
  'beforest',
  'resource',
  'resources',
  'collective',
  'collectives',
  'dropbox',
  'folder',
  'folders',
  'links',
  'link',
  'image',
  'images',
  'photo',
  'photos',
  'video',
  'videos',
  'final',
  'edit',
  'edited',
  'copy',
  'untitled',
  'whatsapp',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'tif',
  'tiff',
  'heic',
  'heif',
  'mp4',
  'mov',
  'img',
  'dsc',
  'pbr',
  'dji',
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]);

function cleanQuickFindToken(token: string) {
  return token
    .toLowerCase()
    .replace(/['’]s$/, '')
    .replace(/[^a-z0-9-]/g, '');
}

function tokenizeQuickFindText(value?: string) {
  if (!value) return [];

  return value
    .split(/[\/_\-.()[\]\s]+/)
    .map(cleanQuickFindToken)
    .filter(token => token.length >= 3)
    .filter(token => !/^\d+$/.test(token))
    .filter(token => !ignoredQuickFindWords.has(token));
}

function buildQuickFinds(files: SearchResult[]) {
  const counts = new Map<string, number>();

  files.forEach(file => {
    const tokens = [
      file.name,
      file.path,
      file.pathLower,
      file.extension,
      file.mediaType,
      file.matchType,
    ].flatMap(tokenizeQuickFindText);

    new Set(tokens).forEach(token => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 10);
}

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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestedThumbnailPathsRef = useRef<Set<string>>(new Set());

  const activeCollection = collections.find(collection => collection.id === activeCollectionId) || collections[0];
  const quickFinds = useMemo(() => {
    const generatedFinds = buildQuickFinds(results);
    return generatedFinds.length ? generatedFinds : defaultQuickSearches;
  }, [results]);

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

    if (savedCollections) {
      setCollections(JSON.parse(savedCollections));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mediaCollections:v1', JSON.stringify(collections));
  }, [collections]);

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
        return !file.isFolder && ext && thumbnailExtensions.has(ext) && !thumbnails[file.path] && !requestedThumbnailPathsRef.current.has(file.path);
      })
      .slice(0, 25)
      .map(file => file.path);

    if (!paths.length) return;
    paths.forEach(path => requestedThumbnailPathsRef.current.add(path));

    try {
      const response = await fetch('/api/thumbnails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, size: 'w1024h768' }),
      });
      const data = await response.json();

      if (response.ok && data.thumbnails) {
        await Promise.all(
          Object.values<string>(data.thumbnails).map(src => new Promise<void>(resolve => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.decoding = 'sync';
            image.src = src;
          }))
        );
        setThumbnails(prev => ({ ...prev, ...data.thumbnails }));
      }
    } catch (error) {
      console.warn('Batch thumbnail load failed:', error);
      paths.forEach(path => requestedThumbnailPathsRef.current.delete(path));
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

      if (previewResponse.status === 'fulfilled' && previewResponse.value.ok) {
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

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#342e29]">
      <header className="sticky top-0 z-30 border-b border-[#d8c9ae] bg-[#fdfbf7]/95 backdrop-blur-md">
        <div className="grid gap-3 px-4 py-3 lg:grid-cols-[210px_minmax(320px,1fr)_auto] lg:items-center lg:px-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png"
                alt="Beforest"
                className="h-9 w-auto object-contain"
              />
              <div className="hidden border-l border-[#d8c9ae] pl-3 text-[11px] uppercase tracking-[0.16em] text-[#342e29]/60 sm:block">
                Media Desk
              </div>
            </div>
            <Button className="lg:hidden" variant="outline" size="icon" onClick={() => setFiltersOpen(true)} aria-label="Open search filters">
              <SlidersHorizontal />
            </Button>
          </div>

          <form onSubmit={handleSearch} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#342e29]/55" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search images, places, people, filenames"
                className="h-11 border-[#d8c9ae] bg-[#fffdf9] pl-9 text-base"
              />
            </div>
            <select
              value={category}
              onChange={event => setCategory(event.target.value as FileCategory)}
              className="h-11 rounded-md border border-[#d8c9ae] bg-[#fffdf9] px-3 text-sm"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Button type="submit" disabled={loading} className="h-11">
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
              Search
            </Button>
          </form>

          <div className="hidden items-center justify-end gap-2 lg:flex">
            <Button variant="outline" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal />
              Search In / Filters
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <section className="flex items-center justify-between gap-4 overflow-hidden border-b border-[#d8c9ae] bg-[#342e29] px-4 py-3 text-[#fdfbf7] lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.16em] text-[#ffc083] md:block">Quick Finds</span>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {quickFinds.map(searchTerm => (
            <button
              key={searchTerm}
              type="button"
              onClick={() => {
                setQuery(searchTerm);
                runSearch(null, searchTerm);
              }}
              className="whitespace-nowrap rounded-full border border-[#fdfbf7]/18 bg-[#fdfbf7]/8 px-3 py-1.5 text-sm text-[#fdfbf7] transition-colors hover:border-[#ffc083] hover:text-[#ffc083]"
            >
              {searchTerm}
            </button>
          ))}
          </div>
        </div>
        <div className="hidden whitespace-nowrap text-sm text-[#fdfbf7]/70 md:block">
          {results.length ? `${results.length} assets on desk` : 'Contact sheet ready'}
          {folderPath ? ` · ${folderPath}` : ''}
        </div>
      </section>

      <main>
        {loading && !results.length ? (
          <div className="grid grid-cols-2 gap-0 bg-[#342e29] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-none bg-[#d8c9ae]/35" />
            ))}
          </div>
        ) : results.length ? (
          <div className="grid grid-cols-2 gap-0 bg-[#342e29] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {results.map((file, index) => (
              <article
                key={`${file.id}-${file.path}`}
                className="group relative aspect-square overflow-hidden border-b border-r border-[#fdfbf7]/15 bg-[#344736]"
              >
                <button type="button" onClick={() => openDetails(file)} className="block h-full w-full text-left">
                  {thumbnails[file.path] ? (
                    <img
                      src={thumbnails[file.path]}
                      alt={file.name}
                      loading={index < 18 ? 'eager' : 'lazy'}
                      decoding={index < 18 ? 'sync' : 'async'}
                      fetchPriority={index < 18 ? 'high' : 'auto'}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045] group-hover:brightness-105 group-hover:saturate-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#fdfbf7]">
                      {fileIcon(file, 'size-10')}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-x-3 bottom-3 translate-y-2 text-[#fdfbf7] opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="truncate text-base leading-tight">{file.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#fdfbf7]/72">
                      {file.extension && <span>{file.extension.toUpperCase()}</span>}
                      <span>{formatFileSize(file.size)}</span>
                      <span>{formatDate(file.serverModified || file.modified)}</span>
                    </div>
                  </div>
                </button>
                <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8 bg-[#fdfbf7]/90" onClick={() => addToCollection(file)}>
                    <Plus />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8 bg-[#fdfbf7]/90" onClick={() => downloadFile(file)}>
                    <Download />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8 bg-[#fdfbf7]/90" onClick={() => openDropboxLink(file)}>
                    <ExternalLink />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="flex min-h-[62vh] items-center justify-center px-6 text-center">
            <div className="max-w-xl">
              <Search className="mx-auto mb-4 size-8 text-[#86312b]" />
              <h1 className="text-4xl font-light leading-tight">Search the Beforest media archive.</h1>
              <p className="mt-3 text-[#342e29]/68">
                Keep the screen clean for images. Choose where to search, dates, extensions, and shortlists from Search In / Filters.
              </p>
            </div>
          </section>
        )}

        <div ref={loadMoreRef} className="flex min-h-20 items-center justify-center border-t border-[#d8c9ae] text-sm text-[#342e29]/60">
          {loading && results.length ? 'Loading the next contact sheet...' : hasMore ? 'More assets load automatically as you scroll.' : results.length ? 'End of current result set.' : ''}
        </div>
      </main>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-auto bg-[#fdfbf7]">
          <DialogHeader>
            <DialogTitle>Search In / Filters</DialogTitle>
            <DialogDescription>Choose where Dropbox should search, then refine the result set without crowding the media wall.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card className="border-[#d8c9ae] bg-[#fffdf9]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal />
                  Refine Search
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
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
                <Input
                  value={extensions}
                  onChange={event => setExtensions(event.target.value)}
                  placeholder="Extensions: jpg,png,mp4"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={orderBy}
                    onChange={event => setOrderBy(event.target.value as 'relevance' | 'last_modified_time')}
                    className="h-9 rounded-md border border-[#d8c9ae] bg-[#fffdf9] px-3 text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="last_modified_time">Newest first</option>
                  </select>
                  <select
                    value={datePreset}
                    onChange={event => setDatePreset(event.target.value as 'any' | '7d' | '30d' | '90d')}
                    className="h-9 rounded-md border border-[#d8c9ae] bg-[#fffdf9] px-3 text-sm"
                  >
                    <option value="any">Any date</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant={filenameOnly ? 'secondary' : 'outline'}
                  onClick={() => setFilenameOnly(value => !value)}
                >
                  Filename only
                </Button>
                <Button type="button" onClick={() => runSearch()}>
                  Apply to media wall
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[#d8c9ae] bg-[#fffdf9]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Folder />
                  Search In
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-[#342e29]/65">Choose a Dropbox folder to search within.</p>
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
                <ScrollArea className="h-[290px] rounded-md border border-[#d8c9ae]">
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

            <Card className="border-[#d8c9ae] bg-[#fffdf9]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Archive />
                  Shortlists
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Input
                    value={newCollectionName}
                    onChange={event => setNewCollectionName(event.target.value)}
                    placeholder="New shortlist"
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

            <Card className="border-[#d8c9ae] bg-[#fffdf9]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info />
                  Current Shortlist
                </CardTitle>
                <p className="text-sm text-[#342e29]/65">{activeCollection.name}</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
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
                      <p className="text-sm text-muted-foreground">Images you shortlist from the wall will appear here.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent showCloseButton={false} className="h-[94vh] max-h-[94vh] w-[96vw] max-w-[1500px] overflow-hidden border-0 bg-[#120f0c] p-0 text-[#fdfbf7]">
          {selectedFile && (
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                aria-label="Close preview"
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[#fdfbf7]/20 bg-black/55 text-[#fdfbf7] backdrop-blur-md transition hover:bg-[#fdfbf7] hover:text-[#342e29] md:right-6 md:top-6"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute inset-0 flex items-center justify-center bg-[#120f0c] p-4 md:p-8">
                {detailLoading && !previewUrl ? (
                  <div className="flex aspect-video items-center justify-center text-[#fdfbf7]/70">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : previewUrl && selectedFile.extension && previewImageExtensions.has(selectedFile.extension.toLowerCase()) ? (
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    className="max-h-[88vh] max-w-full object-contain"
                  />
                ) : previewUrl && selectedFile.extension && videoExtensions.has(selectedFile.extension.toLowerCase()) ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    poster={thumbnails[selectedFile.path] || undefined}
                    className="max-h-[88vh] max-w-full"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-[#fdfbf7]/70">
                    {fileIcon(selectedFile, 'size-12')}
                  </div>
                )}
              </div>

              <div className="absolute left-4 right-16 top-4 flex items-start gap-4 md:left-6 md:right-20 md:top-6">
                <DialogHeader className="max-w-[min(760px,72vw)] text-left">
                  <DialogTitle className="text-xl font-light leading-tight text-[#fdfbf7] drop-shadow-md md:text-3xl">
                    {selectedFile.name}
                  </DialogTitle>
                  <DialogDescription className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-relaxed text-[#fdfbf7]/72 md:text-sm">
                    <span>{formatDate(metadata?.serverModified || selectedFile.serverModified || selectedFile.modified)}</span>
                    <span>{metadata?.extension || selectedFile.extension || selectedFile.tag}</span>
                    <span>{formatFileSize(metadata?.size || selectedFile.size)}</span>
                    {(metadata?.dimensions || selectedFile.dimensions) && (
                      <span>
                        {(metadata?.dimensions || selectedFile.dimensions)?.width} x {(metadata?.dimensions || selectedFile.dimensions)?.height}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
