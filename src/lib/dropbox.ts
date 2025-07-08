import { Dropbox } from 'dropbox';

let dbx: Dropbox | null = null;

// Get fetch function for the current environment with Dropbox SDK compatibility
function getFetchFunction() {
  // Create a fetch wrapper that adds the buffer() method for Node.js environments
  return async function fetchWithBuffer(url: any, options: any) {
    // Use the global fetch (provided by Next.js or Node.js 18+)
    const response = await fetch(url, options);
    
    // Create a proxy to intercept method calls
    return new Proxy(response, {
      get(target, prop) {
        // If buffer method is requested and doesn't exist, provide it
        if (prop === 'buffer' && !(target as any).buffer) {
          return async function() {
            // Clone the response to avoid consuming the body
            const cloned = target.clone();
            const arrayBuffer = await cloned.arrayBuffer();
            return Buffer.from(arrayBuffer);
          };
        }
        
        // For all other properties, return the original
        return (target as any)[prop];
      }
    });
  };
}

export function getDropboxClient(): Dropbox {
  if (!dbx) {
    if (!process.env.DROPBOX_APP_KEY) {
      throw new Error('DROPBOX_APP_KEY environment variable is required');
    }
    
    if (!process.env.DROPBOX_APP_SECRET) {
      throw new Error('DROPBOX_APP_SECRET environment variable is required');
    }
    
    if (!process.env.DROPBOX_REFRESH_TOKEN) {
      throw new Error('DROPBOX_REFRESH_TOKEN environment variable is required');
    }

    // Explicitly provide fetch to Dropbox SDK
    const fetchFn = getFetchFunction();
    console.log('🔧 Dropbox client fetch function type:', typeof fetchFn);
    
    dbx = new Dropbox({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      fetch: fetchFn,
    });
    
    console.log('[DROPBOX] Client initialized successfully');
  }
  
  return dbx;
}

export interface DropboxFileInfo {
  id: string;
  name: string;
  path: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  size?: number;
  modified?: string;
}

export interface DropboxSearchOptions {
  query: string;
  max_results?: number;
  start?: string; // cursor for pagination
  file_categories?: Array<'image' | 'video' | 'audio' | 'document' | 'other'>;
  file_extensions?: string[];
  filename_only?: boolean;
  include_highlights?: boolean;
}

export interface DropboxSearchResult {
  matches: Array<{
    metadata: {
      name: string;
      path_display: string;
      path_lower: string;
      size?: number;
      client_modified?: string;
      content_hash?: string;
    };
    highlight_spans?: Array<{
      highlight_str: string;
      start_index: number;
      end_index: number;
    }>;
  }>;
  cursor?: string;
  has_more: boolean;
}

export type ThumbnailSize = 'small' | 'medium' | 'large' | 'xl';
export type ThumbnailFormat = 'jpeg' | 'png';

const THUMBNAIL_SIZES = {
  small: 'w256h256',    // List view, mobile
  medium: 'w640h480',   // Legacy default
  large: 'w960h640',    // Grid view, high quality
  xl: 'w2048h1536'      // Preview modal, high-DPI
};

export async function getFileThumbnail(
  path: string, 
  size: ThumbnailSize = 'large',
  format: ThumbnailFormat = 'jpeg'
): Promise<string | null> {
  if (!path) {
    console.warn('⚠️ getFileThumbnail called with empty path');
    return null;
  }
  
  const client = getDropboxClient();
  
  try {
    const response = await client.filesGetThumbnail({
      path: path,
      format: { '.tag': format } as any,
      size: { '.tag': THUMBNAIL_SIZES[size] } as any
    });
    
    // The Dropbox SDK returns the result with the file data
    const result = response.result as any;
    
    // Handle the response based on the environment
    if (result.fileBlob) {
      // Browser environment - convert Blob to base64
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(result.fileBlob);
      });
    } else if (result.fileBinary) {
      // Node environment - convert binary to base64
      const buffer = Buffer.from(result.fileBinary, 'binary');
      const base64 = buffer.toString('base64');
      return `data:image/${format};base64,${base64}`;
    }
    
    // Fallback: No file data found
    console.warn('⚠️ No thumbnail data in response');
    return null;
  } catch (error) {
    console.error(`Error getting ${size} thumbnail:`, error);
    return null;
  }
}

// Alias for the search API consistency
export const getDropboxThumbnail = getFileThumbnail;

// Video file detection
const VIDEO_EXTENSIONS = [
  'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', 
  '3gp', 'ogv', 'mts', 'mxf', 'vob', 'rm', 'rmvb', 'asf', 'ts'
];

export function isVideoFile(filename: string): boolean {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? VIDEO_EXTENSIONS.includes(extension) : false;
}

export function getFileType(filename: string): 'video' | 'image' | 'other' {
  if (!filename) return 'other';
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension && VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'];
  if (extension && imageExtensions.includes(extension)) {
    return 'image';
  }
  
  return 'other';
}

export async function getFileDownloadLink(path: string): Promise<string | null> {
  if (!path) {
    console.warn('⚠️ getFileDownloadLink called with empty path');
    return null;
  }
  
  const client = getDropboxClient();
  
  try {
    const response = await client.filesGetTemporaryLink({
      path: path
    });
    
    return response.result.link;
  } catch (error) {
    console.error('Error getting download link:', error);
    return null;
  }
}

// Alias for the search API consistency
export const generateDropboxDownloadLink = getFileDownloadLink;

export async function getFileInfo(path: string): Promise<DropboxFileInfo | null> {
  const client = getDropboxClient();
  
  try {
    const response = await client.filesGetMetadata({
      path: path
    });
    
    const metadata = response.result;
    
    return {
      id: metadata.path_lower || path,
      name: metadata.name,
      path: metadata.path_display || path,
      size: 'size' in metadata ? metadata.size : undefined,
      modified: 'client_modified' in metadata ? metadata.client_modified : undefined,
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

export async function getFilesInfo(paths: string[]): Promise<DropboxFileInfo[]> {
  // Process files concurrently but in batches to avoid rate limiting
  const batchSize = 10;
  const results: DropboxFileInfo[] = [];
  
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const batchPromises = batch.map(async (path) => {
      try {
        const fileInfo = await getFileInfo(path);
        return fileInfo;
      } catch (error) {
        console.error(`Error processing file ${path}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((result): result is DropboxFileInfo => result !== null));
  }
  
  return results;
}

export async function getFilesWithThumbnails(paths: string[]): Promise<Array<DropboxFileInfo & { thumbnailUrl?: string; downloadUrl?: string }>> {
  const filesInfo = await getFilesInfo(paths);
  
  // Get thumbnails and download links concurrently
  const enrichedFiles = await Promise.all(
    filesInfo.map(async (fileInfo) => {
      const [thumbnailUrl, downloadUrl] = await Promise.all([
        getFileThumbnail(fileInfo.path),
        getFileDownloadLink(fileInfo.path)
      ]);
      
      return {
        ...fileInfo,
        thumbnailUrl: thumbnailUrl || undefined,
        downloadUrl: downloadUrl || undefined
      };
    })
  );
  
  return enrichedFiles;
}

/**
 * Advanced batch processing for search results
 * Gets fresh thumbnails and download links for multiple files concurrently
 */
export async function enhanceSearchResults(
  dropboxPaths: string[],
  batchSize: number = 20
): Promise<Map<string, { thumbnailUrl?: string; downloadUrl?: string }>> {
  const resultMap = new Map<string, { thumbnailUrl?: string; downloadUrl?: string }>();
  
  console.log(`🔄 Enhancing ${dropboxPaths.length} search results with fresh Dropbox URLs`);
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < dropboxPaths.length; i += batchSize) {
    const batch = dropboxPaths.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dropboxPaths.length / batchSize)}`);
    
    const batchPromises = batch.map(async (path) => {
      try {
        const [thumbnailUrl, downloadUrl] = await Promise.all([
          getDropboxThumbnail(path, 'large', 'jpeg').catch(() => null), // High-quality thumbnails
          generateDropboxDownloadLink(path).catch(() => null)
        ]);
        
        return {
          path,
          result: {
            thumbnailUrl: thumbnailUrl || undefined,
            downloadUrl: downloadUrl || undefined
          }
        };
      } catch (error) {
        console.error(`⚠️ Error processing ${path}:`, error);
        return {
          path,
          result: {
            thumbnailUrl: undefined,
            downloadUrl: undefined
          }
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Add to result map
    batchResults.forEach(({ path, result }) => {
      resultMap.set(path, result);
    });
  }
  
  console.log(`[DROPBOX] Enhanced ${resultMap.size} search results`);
  return resultMap;
}

/**
 * Optimized concurrent enhancement for 50 images with intelligent batching
 * Uses dynamic batch sizing based on response times and failure rates
 */
export async function enhanceSearchResultsOptimized(
  dropboxPaths: string[],
  targetConcurrency: number = 25 // Optimized for 50 images (2 batches)
): Promise<Map<string, { thumbnailUrl?: string; downloadUrl?: string }>> {
  const resultMap = new Map<string, { thumbnailUrl?: string; downloadUrl?: string }>();
  const startTime = Date.now();
  
  console.log(`🚀 Optimized enhancement for ${dropboxPaths.length} files (concurrency: ${targetConcurrency})`);
  
  // Split into optimal batches for 50 images
  const batches: string[][] = [];
  for (let i = 0; i < dropboxPaths.length; i += targetConcurrency) {
    batches.push(dropboxPaths.slice(i, i + targetConcurrency));
  }
  
  let processedCount = 0;
  let failureCount = 0;
  
  // Process batches with performance monitoring
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchStartTime = Date.now();
    
    console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`);
    
    // Create concurrent promises for the batch
    const batchPromises = batch.map(async (path, index) => {
      const fileStartTime = Date.now();
      
      // Skip if path is undefined or empty
      if (!path) {
        console.warn('⚠️ Skipping empty path in batch');
        return {
          path: '',
          result: {
            thumbnailUrl: undefined,
            downloadUrl: undefined
          },
          success: false,
          processingTime: 0
        };
      }
      
      try {
        // Use Promise.allSettled for better error handling
        // Use high-quality thumbnails for better user experience
        const [thumbnailResult, downloadResult] = await Promise.allSettled([
          getDropboxThumbnail(path, 'large', 'jpeg'), // High-quality thumbnails
          generateDropboxDownloadLink(path)
        ]);
        
        const thumbnailUrl = thumbnailResult.status === 'fulfilled' ? thumbnailResult.value : null;
        const downloadUrl = downloadResult.status === 'fulfilled' ? downloadResult.value : null;
        
        processedCount++;
        const fileTime = Date.now() - fileStartTime;
        
        if (fileTime > 5000) {
          console.warn(`⚠️ Slow file processing: ${path} took ${fileTime}ms`);
        }
        
        return {
          path,
          result: {
            thumbnailUrl: thumbnailUrl || undefined,
            downloadUrl: downloadUrl || undefined
          },
          success: true,
          processingTime: fileTime
        };
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to process ${path}:`, error);
        return {
          path,
          result: {
            thumbnailUrl: undefined,
            downloadUrl: undefined
          },
          success: false,
          processingTime: Date.now() - fileStartTime
        };
      }
    });
    
    // Execute batch concurrently
    const batchResults = await Promise.all(batchPromises);
    const batchTime = Date.now() - batchStartTime;
    
    // Add results to map (skip empty paths)
    batchResults.forEach(({ path, result }) => {
      if (path) {
        resultMap.set(path, result);
      }
    });
    
    // Performance logging
    const avgFileTime = batchTime / batch.length;
    const successRate = ((batch.length - batchResults.filter(r => !r.success).length) / batch.length) * 100;
    
    console.log(`[DROPBOX] Batch ${batchIndex + 1} completed: ${batchTime}ms total, ${avgFileTime.toFixed(0)}ms avg/file, ${successRate.toFixed(1)}% success`);
    
    // Adaptive delay between batches if needed (avoid rate limits)
    if (batchIndex < batches.length - 1 && (avgFileTime > 2000 || successRate < 90)) {
      const delay = Math.min(1000, avgFileTime / 10);
      console.log(`⏱️ Adding ${delay}ms delay before next batch`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successRate = ((processedCount - failureCount) / processedCount) * 100;
  const avgTimePerFile = totalTime / dropboxPaths.length;
  
  console.log(`🎯 Optimization complete: ${totalTime}ms total, ${avgTimePerFile.toFixed(0)}ms avg/file, ${successRate.toFixed(1)}% success`);
  console.log(`📊 Processed ${processedCount} files, ${failureCount} failures, ${resultMap.size} enhanced`);
  
  return resultMap;
}

/**
 * Smart enhancement that chooses between standard and optimized based on file count
 */
export async function enhanceSearchResultsSmart(
  dropboxPaths: string[],
  options: {
    maxConcurrency?: number;
    useOptimized?: boolean;
    targetResponseTime?: number; // ms
  } = {}
): Promise<Map<string, { thumbnailUrl?: string; downloadUrl?: string }>> {
  const { 
    maxConcurrency = 25, 
    useOptimized = dropboxPaths.length >= 20,
    targetResponseTime = 3000
  } = options;
  
  if (useOptimized && dropboxPaths.length >= 10) {
    // Use optimized version for larger batches
    return enhanceSearchResultsOptimized(dropboxPaths, maxConcurrency);
  } else {
    // Use standard version for smaller batches
    const batchSize = Math.min(maxConcurrency, dropboxPaths.length);
    return enhanceSearchResults(dropboxPaths, batchSize);
  }
}

/**
 * Dropbox Search v2 API implementation with cursor-based pagination
 */
export async function searchFilesV2(options: DropboxSearchOptions): Promise<DropboxSearchResult> {
  const client = getDropboxClient();
  
  try {
    console.log(`🔍 Dropbox Search v2: "${options.query}" (max: ${options.max_results || 100})`);
    
    const searchArgs: any = {
      query: options.query,
      options: {
        max_results: Math.min(options.max_results || 100, 1000), // Dropbox limit is 1000
        file_status: 'active',
        filename_only: options.filename_only || false,
        include_highlights: options.include_highlights || false,
      }
    };

    // Add file categories filter if specified
    if (options.file_categories && options.file_categories.length > 0) {
      searchArgs.options.file_categories = options.file_categories.map(cat => ({ '.tag': cat }));
    }

    // Add file extensions filter if specified
    if (options.file_extensions && options.file_extensions.length > 0) {
      searchArgs.options.file_extensions = options.file_extensions;
    }

    let response;
    
    // Use different API calls for first page vs continuation
    if (options.start) {
      console.log(`🔄 [DROPBOX API] Using search/continue_v2 with cursor: ${options.start}`);
      // Use search/continue_v2 for pagination
      response = await client.filesSearchContinueV2({
        cursor: options.start
      });
    } else {
      console.log(`🔄 [DROPBOX API] Using search_v2 for first page`);
      console.log(`🔄 [DROPBOX API] Full search args:`, JSON.stringify(searchArgs, null, 2));
      // Use regular search for first page
      response = await client.filesSearchV2(searchArgs);
    }
    const result = response.result;

    console.log(`📊 Found ${result.matches.length} results, has_more: ${result.has_more}`);
    console.log(`📊 Returned cursor: ${result.cursor || 'NO CURSOR'}`);
    
    // Debug: Log file paths to detect duplicates
    if (result.matches.length > 0) {
      console.log('🔍 First 3 file paths in response:');
      result.matches.slice(0, 3).forEach((match, idx) => {
        const metadata = (match.metadata as any)?.metadata || match.metadata || {};
        console.log(`  ${idx + 1}. ${metadata.path_display || 'NO PATH'}`);
      });
      console.log('🔍 First match structure:', JSON.stringify(result.matches[0], null, 2));
    }

    return {
      matches: result.matches.map(match => {
        // Handle different possible response structures from Dropbox API
        const metadata = (match.metadata as any)?.metadata || match.metadata || {};
        return {
          metadata: {
            name: metadata.name as string,
            path_display: metadata.path_display as string,
            path_lower: metadata.path_lower as string,
            size: metadata.size as number | undefined,
            client_modified: metadata.client_modified as string | undefined,
            content_hash: metadata.content_hash as string | undefined,
          },
          highlight_spans: (match.highlight_spans || []).map((span: any) => ({
            highlight_str: span.highlight_str,
            start_index: span.start_index || 0,
            end_index: span.end_index || 0
          }))
        };
      }),
      cursor: result.cursor,
      has_more: result.has_more
    };
  } catch (error) {
    console.error('Error in Dropbox Search v2:', error);
    throw error;
  }
}

/**
 * Search specifically for images and videos using Dropbox Search v2
 */
export async function searchMediaFilesV2(
  query: string, 
  options: { max_results?: number; start?: string } = {}
): Promise<DropboxSearchResult> {
  return searchFilesV2({
    query,
    max_results: options.max_results || 50,
    start: options.start,
    file_categories: ['image', 'video'],
    include_highlights: true
  });
}

/**
 * Search for videos specifically using Dropbox Search v2
 */
export async function searchVideosV2(
  query: string,
  options: { max_results?: number; start?: string } = {}
): Promise<DropboxSearchResult> {
  return searchFilesV2({
    query,
    max_results: options.max_results || 50,
    start: options.start,
    file_categories: ['video'],
    include_highlights: true
  });
}

/**
 * Enhanced search results with thumbnails and download links
 */
export async function searchMediaWithThumbnails(
  query: string,
  options: { max_results?: number; start?: string; maxConcurrency?: number; useOptimized?: boolean; metadata_only?: boolean } = {}
): Promise<{
  files: Array<DropboxFileInfo & { thumbnailUrl?: string; downloadUrl?: string; highlights?: string[] }>;
  cursor?: string;
  has_more: boolean;
}> {
  // Get search results from Dropbox v2
  const searchResult = await searchMediaFilesV2(query, {
    max_results: options.max_results || 50,
    start: options.start
  });

  // OPTIMIZATION: Skip URL generation for metadata-only requests
  let enhancedMap = new Map<string, { thumbnailUrl?: string; downloadUrl?: string }>();
  
  if (!options.metadata_only) {
    // Extract paths for thumbnail/download URL generation
    const paths = searchResult.matches.map(match => match.metadata.path_display);
    
    // Get enhanced URLs using smart batching (optimized for 50 images)
    enhancedMap = await enhanceSearchResultsSmart(paths, {
      maxConcurrency: options.maxConcurrency || 25,
      useOptimized: options.useOptimized ?? (paths.length >= 20),
      targetResponseTime: 3000
    });
  }
  
  // Combine search results with enhanced URLs (or empty if metadata_only)
  const files = searchResult.matches.map(match => {
    const enhanced = enhancedMap.get(match.metadata.path_display) || {};
    const highlights = match.highlight_spans?.map(span => span.highlight_str) || [];
    
    return {
      id: match.metadata.path_lower,
      name: match.metadata.name,
      path: match.metadata.path_display,
      size: match.metadata.size,
      modified: match.metadata.client_modified,
      thumbnailUrl: options.metadata_only ? undefined : enhanced.thumbnailUrl,
      downloadUrl: options.metadata_only ? undefined : enhanced.downloadUrl,
      highlights
    };
  });

  return {
    files,
    cursor: searchResult.cursor,
    has_more: searchResult.has_more
  };
} 