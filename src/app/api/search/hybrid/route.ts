import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch, hybridVideoSearch, HybridSearchOptions } from '@/lib/hybrid-search';
import { paginateSearch, getCursorFromParams } from '@/lib/cursor-pagination';

interface HybridSearchRequest extends HybridSearchOptions {
  // Additional request-specific fields
}

interface HybridSearchResponse {
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
    source: 'vector' | 'dropbox' | 'hybrid';
    highlights?: string[];
    enhanced: boolean;
    advanced_scores?: {
      composite?: number;
      vector?: number;
      dropbox?: number;
      hybrid?: number;
    };
  }>;
  cursor?: string;
  has_more: boolean;
  total_found: number;
  processing_time: number;
  search_strategy: string;
  query: string;
  debug?: {
    vector_results: number;
    dropbox_results: number;
    merged_results: number;
    duplicate_removal: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<HybridSearchResponse>> {
  const startTime = Date.now();
  
  try {
    const body: HybridSearchRequest = await request.json();
    const { 
      query = '', 
      max_results = 50, 
      search_mode = 'hybrid',
      include_videos = false,
      filters = {},
      cursor
    } = body;

    console.log(`🚀 Hybrid Search API: "${query}" (mode: ${search_mode}, max: ${max_results})`);

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

    // Perform hybrid search with cursor-based pagination
    let searchResult;
    
    if (cursor) {
      // Use cursor-based pagination
      console.log('[HYBRID] Using cursor-based pagination...');
      const paginationResult = await paginateSearch({
        query,
        page_size: max_results,
        cursor,
        search_mode,
        include_videos
      });
      
      searchResult = {
        files: paginationResult.items,
        cursor: paginationResult.next_cursor,
        has_more: paginationResult.has_more,
        total_found: paginationResult.total_count || paginationResult.items.length,
        processing_time: Date.now() - startTime,
        search_strategy: `cursor_${search_mode}`,
        debug: {
          vector_results: 0,
          dropbox_results: paginationResult.items.length,
          merged_results: paginationResult.items.length,
          duplicate_removal: 0
        }
      };
    } else {
      // Use original hybrid search for first page
      searchResult = include_videos 
        ? await hybridVideoSearch({ query, max_results, search_mode, filters, cursor })
        : await hybridSearch({ query, max_results, search_mode, filters, cursor });
    }

    // Transform results for API response
    const transformedFiles = searchResult.files.map(file => ({
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      dropbox_path: file.dropbox_path,
      file_size: file.file_size,
      modified_date: file.modified_date,
      file_extension: file.file_extension,
      thumbnail_url: file.thumbnail_url,
      download_url: file.download_url,
      public_url: file.public_url,
      similarity_percentage: Math.round(Math.min(100, (file.hybrid_score || file.composite_score || file.similarity || 0) * 100)),
      source: file.source,
      highlights: file.highlights || [],
      enhanced: !!(file.thumbnail_url || file.download_url),
      advanced_scores: {
        composite: file.composite_score ? Math.round(file.composite_score * 100) : undefined,
        vector: file.vector_score ? Math.round(file.vector_score * 100) : undefined,
        dropbox: file.dropbox_score ? Math.round(file.dropbox_score * 100) : undefined,
        hybrid: file.hybrid_score ? Math.round(file.hybrid_score * 100) : undefined
      }
    }));

    const response: HybridSearchResponse = {
      files: transformedFiles,
      cursor: searchResult.cursor,
      has_more: searchResult.has_more,
      total_found: searchResult.total_found,
      processing_time: searchResult.processing_time,
      search_strategy: searchResult.search_strategy,
      query,
      debug: searchResult.debug
    };

    console.log(`[HYBRID] Search API completed in ${searchResult.processing_time}ms`);
    console.log(`📊 Results: ${transformedFiles.length} files (${searchResult.debug?.vector_results || 0} vector + ${searchResult.debug?.dropbox_results || 0} dropbox)`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[HYBRID] Search API error:', error);
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      files: [],
      has_more: false,
      total_found: 0,
      processing_time: Date.now() - startTime,
      search_strategy: 'error',
      query: '',
      error: error instanceof Error ? error.message : 'Unknown hybrid search error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HybridSearchResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const max_results = parseInt(searchParams.get('max_results') || '50');
  const search_mode = (searchParams.get('mode') as 'vector' | 'dropbox' | 'hybrid') || 'hybrid';
  const include_videos = searchParams.get('videos') === 'true';
  const cursor = searchParams.get('cursor') || undefined;

  // Convert GET to POST format
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ 
      query, 
      max_results, 
      search_mode,
      include_videos,
      cursor
    }),
    headers: { 'Content-Type': 'application/json' }
  }));
}