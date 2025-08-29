import { NextRequest, NextResponse } from 'next/server';
import { searchMediaWithThumbnails, searchVideosV2 } from '@/lib/dropbox';
import { getCachedData, setCachedData, CacheKeys, CacheTTL } from '@/lib/redis';

interface DropboxSearchRequest {
  query: string;
  max_results?: number;
  cursor?: string;
  search_type?: 'media' | 'video';
  date_filter?: {
    start?: string;
    end?: string;
  };
  metadata_only?: boolean; // Skip URL generation for faster background loading
}

interface DropboxSearchResponse {
  files: Array<{
    id: string;
    file_name: string;
    file_path: string;
    dropbox_path: string;
    file_size?: number;
    modified_date?: string;
    file_extension: string;
    thumbnail_url?: string;
    download_url?: string;
    public_url?: string;
    similarity_percentage: number;
    source: 'dropbox';
    highlights?: string[];
    enhanced: boolean;
  }>;
  cursor?: string;
  has_more: boolean;
  total_found: number;
  processing_time: number;
  search_strategy: string;
  query: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DropboxSearchResponse>> {
  const startTime = Date.now();
  
  try {
    const body: DropboxSearchRequest = await request.json();
    const { 
      query = '', 
      max_results = 50, 
      cursor,
      search_type = 'media',
      date_filter,
      metadata_only = false
    } = body;

    console.log(`[DROPBOX] Search API: "${query}" (type: ${search_type}, max: ${max_results}, metadata_only: ${metadata_only})`);
    
    // Check Redis cache first (only for non-metadata requests)
    if (!metadata_only && !cursor) {
      const cacheKey = CacheKeys.searchResults(query, search_type, 1);
      const cachedResults = await getCachedData<DropboxSearchResponse>(cacheKey);
      
      if (cachedResults) {
        console.log(`[DROPBOX] ⚡ Returning cached results for: "${query}" (type: ${search_type})`);
        console.log(`[DROPBOX] Cache contains ${cachedResults.files.length} files`);
        return NextResponse.json(cachedResults);
      }
    }

    if (!query.trim()) {
      return NextResponse.json({
        files: [],
        has_more: false,
        total_found: 0,
        processing_time: Date.now() - startTime,
        search_strategy: 'empty_query',
        query: '',
        error: 'Query is required'
      }, { status: 400 });
    }

    // When date filtering is active, fetch more results to compensate for filtering
    const searchLimit = (date_filter && (date_filter.start || date_filter.end)) 
      ? Math.min(max_results * 3, 150) // Fetch 3x more results when filtering, max 150
      : max_results;

    console.log(`[DROPBOX] ${date_filter && (date_filter.start || date_filter.end) ? 'Date filtering active' : 'No date filter'}: requesting ${searchLimit} results`);

    // Perform Dropbox search
    let searchResult;
    
    if (search_type === 'video') {
      // Search videos only using dedicated video search
      const videoResult = await searchVideosV2(query, { max_results: searchLimit, start: cursor });
      searchResult = {
        files: videoResult.matches.map(match => ({
          id: match.metadata.path_lower,
          name: match.metadata.name,
          path: match.metadata.path_display,
          size: match.metadata.size,
          modified: match.metadata.client_modified,
          highlights: match.highlight_spans?.map(span => span.highlight_str) || []
        })),
        cursor: videoResult.cursor,
        has_more: videoResult.has_more
      };
    } else {
      // For 'image' and 'media' types, search all media then filter
      searchResult = await searchMediaWithThumbnails(query, { 
        max_results: searchLimit, 
        start: cursor,
        metadata_only: metadata_only
      });
    }

    // Transform results for API response
    let transformedFiles = searchResult.files.map(file => ({
      id: file.id || file.path,
      file_name: file.name,
      file_path: file.path,
      dropbox_path: file.path,
      file_size: file.size,
      modified_date: file.modified,
      file_extension: file.name.split('.').pop()?.toLowerCase() || '',
      thumbnail_url: metadata_only ? undefined : (file as any).thumbnailUrl,
      download_url: metadata_only ? undefined : (file as any).downloadUrl,
      public_url: metadata_only ? undefined : (file as any).downloadUrl,
      similarity_percentage: 85, // Default similarity for Dropbox search
      source: 'dropbox' as const,
      highlights: (file as any).highlights || [],
      enhanced: metadata_only ? false : !!((file as any).thumbnailUrl || (file as any).downloadUrl)
    }));
    
    // Apply media type filtering BEFORE date filtering
    if (search_type !== 'media') {
      const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'heic', 'heif'];
      
      console.log(`[DROPBOX] Before filtering: ${transformedFiles.length} files for search_type: ${search_type}`);
      console.log(`[DROPBOX] Sample extensions:`, transformedFiles.slice(0, 5).map(f => f.file_extension));
      
      if (search_type === 'video') {
        // Filter for videos only
        const beforeCount = transformedFiles.length;
        transformedFiles = transformedFiles.filter(file => 
          videoExtensions.includes(file.file_extension)
        );
        console.log(`[DROPBOX] Video filtering: ${beforeCount} → ${transformedFiles.length} files`);
      } else if (search_type === 'image') {
        // Filter for images only  
        const beforeCount = transformedFiles.length;
        transformedFiles = transformedFiles.filter(file => 
          imageExtensions.includes(file.file_extension)
        );
        console.log(`[DROPBOX] Image filtering: ${beforeCount} → ${transformedFiles.length} files`);
      }
    }

    // Apply date filtering if provided
    let dateFilteredFiles = transformedFiles;
    if (date_filter && (date_filter.start || date_filter.end)) {
      const originalCount = transformedFiles.length;
      
      dateFilteredFiles = transformedFiles.filter(file => {
        if (!file.modified_date) return true; // Keep files without dates
        
        const fileDate = new Date(file.modified_date);
        const startDate = date_filter.start ? new Date(date_filter.start) : null;
        const endDate = date_filter.end ? new Date(date_filter.end) : null;
        
        // Apply start date filter
        if (startDate && fileDate < startDate) {
          return false;
        }
        
        // Apply end date filter (include the entire end date)
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999); // End of the selected day
          if (fileDate > endOfDay) {
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`[DROPBOX] Date filtering: ${originalCount} → ${dateFilteredFiles.length} files (start: ${date_filter.start}, end: ${date_filter.end})`);
    }

    // Limit to requested page size after filtering
    const finalFiles = dateFilteredFiles.slice(0, max_results);
    const actualHasMore = dateFilteredFiles.length > max_results || (dateFilteredFiles.length === max_results && searchResult.has_more);
    
    console.log(`[DROPBOX] Final result: ${finalFiles.length} files returned, hasMore: ${actualHasMore}`);

    // Sort results to ensure a good mix of images and videos (prevent video-first clustering)
    if (search_type === 'media' && finalFiles.length > 1) {
      const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv'];
      
      // Separate images and videos from final filtered results
      const images = finalFiles.filter(file => !videoExtensions.includes(file.file_extension));
      const videos = finalFiles.filter(file => videoExtensions.includes(file.file_extension));
      
      // Create a mixed array with alternating content types for better visual balance
      const mixedResults = [];
      const maxLength = Math.max(images.length, videos.length);
      
      for (let i = 0; i < maxLength; i++) {
        // Add image first (if available), then video
        if (i < images.length) mixedResults.push(images[i]);
        if (i < videos.length) mixedResults.push(videos[i]);
      }
      
      // Replace the final files array with the mixed one
      finalFiles.splice(0, finalFiles.length, ...mixedResults);
      
      console.log(`[DROPBOX] Sorted results: ${images.length} images, ${videos.length} videos, mixed for better balance`);
    }

    const response: DropboxSearchResponse = {
      files: finalFiles, // Use filtered and limited files
      cursor: actualHasMore ? searchResult.cursor : undefined, // Only provide cursor if there are more results
      has_more: actualHasMore,
      total_found: dateFilteredFiles.length, // Total after date filtering
      processing_time: Date.now() - startTime,
      search_strategy: date_filter && (date_filter.start || date_filter.end) ? `dropbox_${search_type}_date_filtered` : `dropbox_${search_type}`,
      query
    };

    console.log(`[DROPBOX] Search API completed in ${response.processing_time}ms`);
    console.log(`[DROPBOX] Results: ${finalFiles.length}/${dateFilteredFiles.length} files (${date_filter && (date_filter.start || date_filter.end) ? 'with date filter' : 'no filter'})`);
    
    // DEBUGGING: Final response validation
    console.log(`[DROPBOX] 🔍 Final response for search_type "${search_type}":`, {
      fileCount: finalFiles.length,
      sampleExtensions: finalFiles.slice(0, 3).map(f => f.file_extension),
      searchType: search_type,
      query: query
    });

    // Cache the response (only for non-metadata, first page requests)
    if (!metadata_only && !cursor && finalFiles.length > 0) {
      const cacheKey = CacheKeys.searchResults(query, search_type, 1);
      console.log(`[DROPBOX] 💾 Caching results with key: ${cacheKey}`);
      await setCachedData(cacheKey, response, CacheTTL.searchResults);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[DROPBOX] Search API error:', error);
    
    return NextResponse.json({
      files: [],
      has_more: false,
      total_found: 0,
      processing_time: Date.now() - startTime,
      search_strategy: 'error',
      query: '',
      error: error instanceof Error ? error.message : 'Unknown search error'
    }, { status: 500 });
  }
}