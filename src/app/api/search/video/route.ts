import { NextRequest, NextResponse } from 'next/server';
import { searchVideosV2, searchMediaWithThumbnails, enhanceSearchResults } from '@/lib/dropbox';
import { paginateSearch } from '@/lib/cursor-pagination';

interface VideoSearchRequest {
  query: string;
  max_results?: number;
  cursor?: string;
  search_mode?: 'dropbox' | 'hybrid';
  include_thumbnails?: boolean;
}

interface VideoSearchResponse {
  videos: Array<{
    id: string;
    name: string;
    path: string;
    size?: number;
    modified?: string;
    thumbnailUrl?: string;
    downloadUrl?: string;
    highlights?: string[];
    source: 'dropbox' | 'hybrid';
    file_extension: string;
    similarity_percentage?: number;
  }>;
  cursor?: string;
  has_more: boolean;
  total_found: number;
  processing_time: number;
  search_strategy: string;
  query: string;
  debug?: {
    dropbox_results: number;
    enhanced_results: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<VideoSearchResponse>> {
  const startTime = Date.now();
  
  try {
    const body: VideoSearchRequest = await request.json();
    const { 
      query = '', 
      max_results = 25, 
      cursor,
      search_mode = 'dropbox',
      include_thumbnails = true
    } = body;

    console.log(`[VIDEO] Search API: "${query}" (max: ${max_results}, mode: ${search_mode})`);

    if (!query.trim()) {
      return NextResponse.json({
        videos: [],
        has_more: false,
        total_found: 0,
        processing_time: Date.now() - startTime,
        search_strategy: 'empty_query',
        query: '',
        error: 'Query is required'
      }, { status: 400 });
    }

    let searchResult;
    let searchStrategy: string;

    if (cursor) {
      // Use cursor-based pagination
      console.log('[VIDEO] Using cursor-based pagination for videos...');
      const paginationResult = await paginateSearch({
        query,
        page_size: max_results,
        cursor,
        search_mode,
        include_videos: true
      });
      
      searchResult = {
        videos: paginationResult.items,
        cursor: paginationResult.next_cursor,
        has_more: paginationResult.has_more,
        total_found: paginationResult.total_count || paginationResult.items.length,
        processing_time: Date.now() - startTime,
        search_strategy: `cursor_video_${search_mode}`,
        debug: {
          dropbox_results: paginationResult.items.length,
          enhanced_results: paginationResult.items.length
        }
      };
    } else {
      // Direct video search for first page
      console.log('[VIDEO] Performing direct video search...');
      
      if (include_thumbnails) {
        // Use the enhanced search that includes thumbnails
        const mediaResult = await searchMediaWithThumbnails(query, {
          max_results,
          start: cursor
        });
        
        // Filter for video files only
        const videoFiles = mediaResult.files.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ext && ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v'].includes(ext);
        });
        
        searchResult = {
          videos: videoFiles.map(file => ({
            id: file.id,
            name: file.name,
            path: file.path,
            size: file.size,
            modified: file.modified,
            thumbnailUrl: file.thumbnailUrl,
            downloadUrl: file.downloadUrl,
            highlights: file.highlights || [],
            source: 'dropbox' as const,
            file_extension: file.name.split('.').pop()?.toLowerCase() || '',
            similarity_percentage: 85 // Default relevance for video search
          })),
          cursor: mediaResult.cursor,
          has_more: mediaResult.has_more,
          total_found: videoFiles.length,
          processing_time: Date.now() - startTime,
          search_strategy: 'dropbox_video_enhanced',
          debug: {
            dropbox_results: mediaResult.files.length,
            enhanced_results: videoFiles.length
          }
        };
      } else {
        // Direct video search without thumbnails
        const videoResult = await searchVideosV2(query, {
          max_results,
          start: cursor
        });
        
        searchResult = {
          videos: videoResult.matches.map(match => ({
            id: match.metadata.path_lower,
            name: match.metadata.name,
            path: match.metadata.path_display,
            size: match.metadata.size,
            modified: match.metadata.client_modified,
            highlights: match.highlight_spans?.map(span => span.highlight_str) || [],
            source: 'dropbox' as const,
            file_extension: match.metadata.name.split('.').pop()?.toLowerCase() || '',
            similarity_percentage: 85 // Default relevance for video search
          })),
          cursor: videoResult.cursor,
          has_more: videoResult.has_more,
          total_found: videoResult.matches.length,
          processing_time: Date.now() - startTime,
          search_strategy: 'dropbox_video_direct',
          debug: {
            dropbox_results: videoResult.matches.length,
            enhanced_results: videoResult.matches.length
          }
        };
      }
      
      searchStrategy = include_thumbnails ? 'dropbox_video_enhanced' : 'dropbox_video_direct';
    }

    const response: VideoSearchResponse = {
      ...searchResult,
      query
    };

    console.log(`[VIDEO] Search API completed in ${searchResult.processing_time}ms`);
    console.log(`[VIDEO] Found ${searchResult.videos.length} videos, has_more: ${searchResult.has_more}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[VIDEO] Search API error:', error);
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      videos: [],
      has_more: false,
      total_found: 0,
      processing_time: Date.now() - startTime,
      search_strategy: 'error',
      query: '',
      error: error instanceof Error ? error.message : 'Unknown video search error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<VideoSearchResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const max_results = parseInt(searchParams.get('max_results') || '25');
  const cursor = searchParams.get('cursor') || undefined;
  const search_mode = (searchParams.get('mode') as 'dropbox' | 'hybrid') || 'dropbox';
  const include_thumbnails = searchParams.get('thumbnails') !== 'false';

  // Convert GET to POST format
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ 
      query, 
      max_results,
      cursor,
      search_mode,
      include_thumbnails
    }),
    headers: { 'Content-Type': 'application/json' }
  }));
}