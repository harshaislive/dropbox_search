import { NextRequest, NextResponse } from 'next/server';
import { searchMediaWithThumbnails, searchVideosV2 } from '@/lib/dropbox';

interface DropboxSearchRequest {
  query: string;
  max_results?: number;
  cursor?: string;
  search_type?: 'media' | 'video';
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
      search_type = 'media'
    } = body;

    console.log(`[DROPBOX] Search API: "${query}" (type: ${search_type}, max: ${max_results})`);

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

    // Perform Dropbox search
    let searchResult;
    
    if (search_type === 'video') {
      // Search videos only
      const videoResult = await searchVideosV2(query, { max_results, start: cursor });
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
      // Search all media (images and videos)
      searchResult = await searchMediaWithThumbnails(query, { max_results, start: cursor });
    }

    // Transform results for API response
    const transformedFiles = searchResult.files.map(file => ({
      id: file.id || file.path,
      file_name: file.name,
      file_path: file.path,
      dropbox_path: file.path,
      file_size: file.size,
      modified_date: file.modified,
      file_extension: file.name.split('.').pop()?.toLowerCase() || '',
      thumbnail_url: (file as any).thumbnailUrl,
      download_url: (file as any).downloadUrl,
      public_url: (file as any).downloadUrl,
      similarity_percentage: 85, // Default similarity for Dropbox search
      source: 'dropbox' as const,
      highlights: (file as any).highlights || [],
      enhanced: !!((file as any).thumbnailUrl || (file as any).downloadUrl)
    }));

    // Sort results to ensure a good mix of images and videos (prevent video-first clustering)
    if (search_type === 'media' && transformedFiles.length > 1) {
      const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv'];
      
      // Separate images and videos
      const images = transformedFiles.filter(file => !videoExtensions.includes(file.file_extension));
      const videos = transformedFiles.filter(file => videoExtensions.includes(file.file_extension));
      
      // Create a mixed array with alternating content types for better visual balance
      const mixedResults = [];
      const maxLength = Math.max(images.length, videos.length);
      
      for (let i = 0; i < maxLength; i++) {
        // Add image first (if available), then video
        if (i < images.length) mixedResults.push(images[i]);
        if (i < videos.length) mixedResults.push(videos[i]);
      }
      
      // Replace the original array with the mixed one
      transformedFiles.splice(0, transformedFiles.length, ...mixedResults);
      
      console.log(`[DROPBOX] Sorted results: ${images.length} images, ${videos.length} videos, mixed for better balance`);
    }

    const response: DropboxSearchResponse = {
      files: transformedFiles,
      cursor: searchResult.cursor,
      has_more: searchResult.has_more,
      total_found: transformedFiles.length,
      processing_time: Date.now() - startTime,
      search_strategy: `dropbox_${search_type}`,
      query
    };

    console.log(`[DROPBOX] Search API completed in ${response.processing_time}ms`);
    console.log(`[DROPBOX] Results: ${transformedFiles.length} files`);

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