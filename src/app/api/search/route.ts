import { NextRequest, NextResponse } from 'next/server';
import { searchVectors, advancedSearchVectors, fallbackSearch, SearchResult } from '@/lib/weaviate';
import { getDropboxThumbnail, generateDropboxDownloadLink } from '@/lib/dropbox';

interface SearchFilters {
  dateRange?: {
    start?: string;
    end?: string;
  };
  fileTypes?: string[];
  minFileSize?: number;
  maxFileSize?: number;
  minSimilarity?: number;
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'size' | 'name';
  sortOrder?: 'desc' | 'asc';
}

interface SearchRequest {
  query?: string;
  limit?: number;
  offset?: number;
  useAdvanced?: boolean;
  filters?: SearchFilters;
}

interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  query: string;
  processingTime: number;
  searchStrategy: string;
  hasMore: boolean;
  currentPage: number;
  debug?: {
    vectorResults: number;
    textResults: number;
    uniqueResults: number;
    qualityScoreRange?: { min: number; max: number };
    compositeScoreRange?: { min: number; max: number };
  };
  error?: string;
}

// Apply filters to search results
function applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  let filtered = results;

  // Date range filter
  if (filters.dateRange?.start || filters.dateRange?.end) {
    filtered = filtered.filter(result => {
      const fileDate = result.modified_date || result.processed_date;
      if (!fileDate) return false;
      
      const date = new Date(fileDate);
      const startDate = filters.dateRange?.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange?.end ? new Date(filters.dateRange.end) : null;
      
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });
  }

  // File type filter
  if (filters.fileTypes && filters.fileTypes.length > 0) {
    filtered = filtered.filter(result => {
      const extension = result.file_extension || result.file_name?.split('.').pop()?.toLowerCase();
      return extension && filters.fileTypes!.includes(extension);
    });
  }

  // File size filter
  if (filters.minFileSize || filters.maxFileSize) {
    filtered = filtered.filter(result => {
      if (!result.file_size) return false;
      if (filters.minFileSize && result.file_size < filters.minFileSize) return false;
      if (filters.maxFileSize && result.file_size > filters.maxFileSize) return false;
      return true;
    });
  }

  // Similarity threshold filter
  if (filters.minSimilarity && filters.minSimilarity > 0) {
    const threshold = filters.minSimilarity / 100;
    filtered = filtered.filter(result => {
      const score = result.composite_score || result.similarity || 0;
      return score >= threshold;
    });
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(result => {
      if (!result.tags?.length) return false;
      return filters.tags!.some((filterTag: string) => 
        result.tags!.some(resultTag => 
          resultTag.toLowerCase().includes(filterTag.toLowerCase())
        )
      );
    });
  }

  // Apply sorting
  if (filters.sortBy && filters.sortBy !== 'relevance') {
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'date':
          aValue = new Date(a.modified_date || a.processed_date || 0);
          bValue = new Date(b.modified_date || b.processed_date || 0);
          break;
        case 'size':
          aValue = a.file_size || 0;
          bValue = b.file_size || 0;
          break;
        case 'name':
          aValue = a.file_name || '';
          bValue = b.file_name || '';
          break;
        default:
          aValue = a.composite_score || a.similarity || 0;
          bValue = b.composite_score || b.similarity || 0;
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  return filtered;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
        const body: SearchRequest = await request.json();
  const { query = '', limit = 21, offset = 0, useAdvanced = true, filters = {} } = body;

  console.log(`🚀 Search API called with query: "${query}", limit: ${limit}, offset: ${offset}, advanced: ${useAdvanced}`);

  if (!query.trim()) {
    return NextResponse.json({
      results: [],
      totalFound: 0,
      query: '',
      processingTime: Date.now() - startTime,
      searchStrategy: 'empty_query',
      hasMore: false,
      currentPage: 1,
      error: 'Query is required'
    }, { status: 400 });
  }

  let allSearchResults: SearchResult[] = [];
  let searchStrategy = 'unknown';
  
  try {
    // Always get 120 results for proper sorting and pagination
    console.log('📊 Retrieving 120 results for complete dataset...');
    
    // Use vector-only search for smart search
    if (useAdvanced) {
      console.log('🎯 Using vector-only smart search with re-ranking...');
      allSearchResults = await advancedSearchVectors({
        query,
        className: 'DropboxFile',
        limit: 120, // Final limit after re-ranking
        offset: 0,  // Always start from beginning for sorting
        certainty: 0.7,
        useAdvanced: true
      });
      searchStrategy = 'vector_reranked';
    } else {
      console.log('🔍 Using standard dual search strategy...');
      allSearchResults = await searchVectors({
        query,
        className: 'DropboxFile',
        limit: 120, // Always get 120 results
        offset: 0,  // Always start from beginning for sorting
        certainty: 0.7,
        useAdvanced: false
      });
      searchStrategy = 'dual_search';
    }
    
    if (allSearchResults.length === 0) {
      console.log('🔄 Primary search returned no results, trying fallback...');
      allSearchResults = await fallbackSearch({
        query,
        className: 'DropboxFile',
        limit: 120, // Always get 120 results
        offset: 0   // Always start from beginning for sorting
      });
      searchStrategy = 'fallback_search';
    }
    
  } catch (error) {
    console.error('❌ Primary search failed, using fallback:', error);
    allSearchResults = await fallbackSearch({
      query,
      className: 'DropboxFile', 
      limit: 120, // Always get 120 results
      offset: 0   // Always start from beginning for sorting
    });
    searchStrategy = 'fallback_only';
  }

      // Apply filters to all results
    const filteredResults = applyFilters(allSearchResults, filters);
    console.log(`🎛️ After filtering: ${filteredResults.length} results (from ${allSearchResults.length} original)`);

    // Sort filtered results by score (high to low) - ALWAYS (unless custom sort applied)
    if (!filters.sortBy || filters.sortBy === 'relevance') {
      filteredResults.sort((a, b) => {
        const scoreA = a.composite_score || a.similarity || 0;
        const scoreB = b.composite_score || b.similarity || 0;
        return scoreB - scoreA;
      });
    }

    console.log(`🎯 Sorted ${filteredResults.length} results by ${filters.sortBy || 'relevance'} (${filters.sortOrder || 'desc'})`);

    // Paginate through the filtered and sorted results (21 per page)
    const startIndex = offset;
    const endIndex = offset + limit;
    const searchResults = filteredResults.slice(startIndex, endIndex);
  
      console.log(`[SEARCH] Returning page ${Math.floor(offset / 21) + 1}: results ${startIndex + 1}-${Math.min(endIndex, filteredResults.length)} of ${filteredResults.length}`);

    console.log(`📊 Search completed using ${searchStrategy}, found ${searchResults.length} results`);

    // Enhance results with fresh Dropbox URLs (concurrent processing for 21 results)
    const enhancedResults = await Promise.all(
      searchResults.slice(0, 21).map(async (result) => { // Ensure max 21 results per page
        try {
          // Only fetch new URLs if we don't have them already
          let thumbnailUrl = result.thumbnail_url;
          let downloadUrl = result.download_url || result.public_url;
          
          // Force thumbnail and download URL generation for videos, or if we don't have URLs
          const isVideo = result.file_name?.toLowerCase().match(/\.(mp4|avi|mov|mkv|wmv|flv|webm|m4v|mpg|mpeg|3gp|ogv)$/);
          
          if (!thumbnailUrl || !downloadUrl || isVideo) {
            const [newThumbnail, newDownload] = await Promise.all([
              (!thumbnailUrl || isVideo) ? getDropboxThumbnail(result.dropbox_path).catch(() => null) : Promise.resolve(null),
              !downloadUrl ? generateDropboxDownloadLink(result.dropbox_path).catch(() => null) : Promise.resolve(null)
            ]);
            
            if (newThumbnail) thumbnailUrl = newThumbnail;
            if (newDownload) downloadUrl = newDownload;
          }

          return {
            ...result,
            thumbnail_url: thumbnailUrl || undefined,
            download_url: downloadUrl || undefined,
            public_url: downloadUrl || undefined,
            // Ensure similarity is a percentage (normalized to 0-100%)
            similarity_percentage: Math.round(Math.min(100, ((result.composite_score || result.similarity) || 0) * 100)),
            // Add search metadata
            search_source: result.source || 'unknown',
            enhanced: true,
            // Include advanced scoring details if available
            ...(result.composite_score && {
              advanced_scores: {
                composite: Math.round(Math.min(100, result.composite_score * 100)),
                vector: Math.round((result.vector_score || 0) * 100),
                text: Math.round((result.text_score || 0) * 100),
                tag: Math.round((result.tag_score || 0) * 100),
                quality: Math.round((result.quality_score || 1) * 100)
              }
            })
          };
        } catch (error) {
          console.error(`⚠️ Error enhancing result for ${result.dropbox_path}:`, error);
          return {
            ...result,
            similarity_percentage: Math.round(Math.min(100, ((result.composite_score || result.similarity) || 0) * 100)),
            search_source: result.source || 'unknown',
            enhanced: false
          };
        }
      })
    );

    const processingTime = Date.now() - startTime;
    
    // Count results by source for debugging
    const vectorResults = enhancedResults.filter(r => r.search_source === 'vector').length;
    const textResults = enhancedResults.filter(r => r.search_source === 'text').length;

    // Calculate quality and composite score ranges for debugging
    const qualityScores = enhancedResults
      .map(r => r.quality_score)
      .filter(s => s !== undefined) as number[];
    const compositeScores = enhancedResults
      .map(r => r.composite_score)
      .filter(s => s !== undefined) as number[];

    // Determine if there are more results available (based on filtered results)
    const totalResults = filteredResults.length;
    const hasMore = (offset + enhancedResults.length) < totalResults;
    
    const response: SearchResponse = {
      results: enhancedResults,
      totalFound: totalResults, // Total results available
      query,
      processingTime,
      searchStrategy,
      hasMore,
      currentPage: Math.floor(offset / 21) + 1, // Fixed page size of 21
      debug: {
        vectorResults,
        textResults,
        uniqueResults: enhancedResults.length,
        ...(qualityScores.length > 0 && {
          qualityScoreRange: {
            min: Math.min(...qualityScores),
            max: Math.max(...qualityScores)
          }
        }),
        ...(compositeScores.length > 0 && {
          compositeScoreRange: {
            min: Math.min(...compositeScores),
            max: Math.max(...compositeScores)
          }
        })
      }
    };

    console.log(`[SEARCH] API completed in ${processingTime}ms`);
    console.log(`📈 Results breakdown: ${vectorResults} vector, ${textResults} text, ${enhancedResults.length} total`);
    console.log(`[SEARCH] Pagination: page ${response.currentPage}, hasMore: ${hasMore}`);
    
    if (useAdvanced && compositeScores.length > 0) {
      console.log(`🎯 Advanced scoring: composite range ${Math.min(...compositeScores).toFixed(3)}-${Math.max(...compositeScores).toFixed(3)}`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[SEARCH] API error:', error);
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      results: [],
      totalFound: 0,
      query: '',
      processingTime,
      searchStrategy: 'error',
      hasMore: false,
      currentPage: 1,
      error: error instanceof Error ? error.message : 'Unknown search error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '21');
  const offset = parseInt(searchParams.get('offset') || '0');
  const useAdvanced = searchParams.get('advanced') !== 'false'; // Default to true

  // Convert GET to POST format
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ query, limit, offset, useAdvanced }),
    headers: { 'Content-Type': 'application/json' }
  }));
} 