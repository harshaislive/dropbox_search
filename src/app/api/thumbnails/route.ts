import { NextRequest, NextResponse } from 'next/server';
import { getDropboxThumbnail, generateDropboxDownloadLink } from '@/lib/dropbox';
import { getCachedData, setCachedData, getCachedBatch, setCachedBatch, CacheKeys, CacheTTL } from '@/lib/redis';

interface ThumbnailRequest {
  paths: string[]; // Array of Dropbox paths
}

interface ThumbnailResponse {
  thumbnails: Record<string, {
    thumbnail_url?: string;
    download_url?: string;
    cached?: boolean;
  }>;
}

export async function POST(request: NextRequest): Promise<NextResponse<ThumbnailResponse>> {
  try {
    const body: ThumbnailRequest = await request.json();
    const { paths } = body;

    if (!paths || paths.length === 0) {
      return NextResponse.json({ thumbnails: {} });
    }

    console.log(`[THUMBNAILS] Processing ${paths.length} thumbnail requests`);

    // Prepare cache keys
    const thumbnailKeys = paths.map(path => CacheKeys.thumbnailUrl(path));
    const downloadKeys = paths.map(path => CacheKeys.downloadUrl(path));

    // Check cache for existing URLs
    const [cachedThumbnails, cachedDownloads] = await Promise.all([
      getCachedBatch<string>(thumbnailKeys),
      getCachedBatch<string>(downloadKeys)
    ]);

    const results: Record<string, any> = {};
    const pathsToFetch: string[] = [];

    // Process cached results
    paths.forEach((path, index) => {
      const thumbnailKey = thumbnailKeys[index];
      const downloadKey = downloadKeys[index];
      const cachedThumbnail = cachedThumbnails.get(thumbnailKey);
      const cachedDownload = cachedDownloads.get(downloadKey);

      if (cachedThumbnail || cachedDownload) {
        results[path] = {
          thumbnail_url: cachedThumbnail,
          download_url: cachedDownload,
          cached: true
        };
      } else {
        pathsToFetch.push(path);
      }
    });

    console.log(`[THUMBNAILS] Cache: ${Object.keys(results).length} hits, ${pathsToFetch.length} misses`);

    // Fetch missing thumbnails in parallel (with concurrency limit)
    const BATCH_SIZE = 10;
    const itemsToCache: Array<{ key: string; value: string; ttl?: number }> = [];

    for (let i = 0; i < pathsToFetch.length; i += BATCH_SIZE) {
      const batch = pathsToFetch.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (path) => {
        try {
          const [thumbnailUrl, downloadUrl] = await Promise.all([
            getDropboxThumbnail(path, 'large', 'jpeg').catch(() => null),
            generateDropboxDownloadLink(path).catch(() => null)
          ]);

          results[path] = {
            thumbnail_url: thumbnailUrl || undefined,
            download_url: downloadUrl || undefined,
            cached: false
          };

          // Prepare for caching
          if (thumbnailUrl) {
            itemsToCache.push({
              key: CacheKeys.thumbnailUrl(path),
              value: thumbnailUrl,
              ttl: CacheTTL.thumbnailUrl
            });
          }
          if (downloadUrl) {
            itemsToCache.push({
              key: CacheKeys.downloadUrl(path),
              value: downloadUrl,
              ttl: CacheTTL.downloadUrl
            });
          }
        } catch (error) {
          console.error(`Error fetching URLs for ${path}:`, error);
          results[path] = {
            thumbnail_url: undefined,
            download_url: undefined,
            cached: false
          };
        }
      });

      await Promise.all(batchPromises);
    }

    // Cache newly fetched URLs
    if (itemsToCache.length > 0) {
      await setCachedBatch(itemsToCache);
    }

    console.log(`[THUMBNAILS] Completed: ${Object.keys(results).length} results`);

    return NextResponse.json({ thumbnails: results });

  } catch (error) {
    console.error('[THUMBNAILS] API error:', error);
    return NextResponse.json({ thumbnails: {} }, { status: 500 });
  }
}