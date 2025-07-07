import { searchVectors, advancedSearchVectors, fallbackSearch, SearchResult } from './weaviate';
import { searchMediaWithThumbnails, searchVideosV2, DropboxFileInfo } from './dropbox';

export interface HybridSearchOptions {
  query: string;
  max_results?: number;
  cursor?: string;
  search_mode?: 'vector' | 'dropbox' | 'hybrid';
  include_videos?: boolean;
  filters?: {
    dateRange?: { start?: string; end?: string };
    fileTypes?: string[];
    minFileSize?: number;
    maxFileSize?: number;
    minSimilarity?: number;
    tags?: string[];
    sortBy?: 'relevance' | 'date' | 'size' | 'name';
    sortOrder?: 'desc' | 'asc';
  };
}

export interface HybridSearchResult {
  files: Array<SearchResult & { 
    source: 'vector' | 'dropbox' | 'hybrid';
    highlights?: string[];
    dropbox_score?: number;
    vector_score?: number;
    hybrid_score?: number;
  }>;
  cursor?: string;
  has_more: boolean;
  total_found: number;
  processing_time: number;
  search_strategy: string;
  debug?: {
    vector_results: number;
    dropbox_results: number;
    merged_results: number;
    duplicate_removal: number;
  };
}

/**
 * Normalize Dropbox search results to match Weaviate SearchResult format
 */
function normalizeDropboxResults(
  dropboxFiles: Array<DropboxFileInfo & { highlights?: string[] }>,
  query: string
): Array<SearchResult & { source: 'dropbox'; highlights?: string[]; dropbox_score?: number }> {
  return dropboxFiles.filter(file => file && file.name && file.path).map(file => {
    // Calculate a simple relevance score based on query match
    const nameMatch = file.name.toLowerCase().includes(query.toLowerCase());
    const pathMatch = file.path.toLowerCase().includes(query.toLowerCase());
    const highlightMatch = file.highlights && file.highlights.length > 0;
    
    const score = (nameMatch ? 0.4 : 0) + (pathMatch ? 0.3 : 0) + (highlightMatch ? 0.3 : 0);
    
    return {
      id: file.id || file.path,
      file_name: file.name,
      file_path: file.path,
      dropbox_path: file.path,
      file_size: file.size,
      modified_date: file.modified,
      processed_date: file.modified,
      file_extension: file.name.split('.').pop()?.toLowerCase() || '',
      thumbnail_url: file.thumbnailUrl,
      download_url: file.downloadUrl,
      public_url: file.downloadUrl,
      similarity: score,
      composite_score: score,
      source: 'dropbox' as const,
      highlights: file.highlights,
      dropbox_score: score,
      tags: [], // Dropbox doesn't provide tags in search results
      caption: file.highlights?.join(', ') || file.name,
      quality_score: 1.0,
      vector_score: 0,
      text_score: score,
      tag_score: 0
    };
  });
}

/**
 * Merge and deduplicate results from vector and Dropbox searches
 */
function mergeSearchResults(
  vectorResults: SearchResult[],
  dropboxResults: Array<SearchResult & { source: 'dropbox' }>,
  query: string
): Array<SearchResult & { source: 'vector' | 'dropbox' | 'hybrid' }> {
  const pathMap = new Map<string, SearchResult & { source: 'vector' | 'dropbox' | 'hybrid' }>();
  const duplicateCount = { removed: 0 };
  
  // Add vector results first
  vectorResults.forEach(result => {
    const normalizedPath = result.dropbox_path.toLowerCase();
    pathMap.set(normalizedPath, {
      ...result,
      source: 'vector' as const,
      vector_score: result.composite_score || result.similarity || 0
    });
  });
  
  // Add Dropbox results, handling duplicates
  dropboxResults.forEach(result => {
    const normalizedPath = result.dropbox_path.toLowerCase();
    const existing = pathMap.get(normalizedPath);
    
    if (existing) {
      // Merge results - combine scores and sources
      duplicateCount.removed++;
      const hybridScore = (existing.vector_score || 0) * 0.6 + ((result as any).dropbox_score || 0) * 0.4;
      
      pathMap.set(normalizedPath, {
        ...existing,
        ...result,
        source: 'hybrid' as const,
        composite_score: hybridScore,
        similarity: hybridScore,
        // Combine captions/descriptions
        caption: existing.caption && result.caption 
          ? `${existing.caption} | ${result.caption}`
          : existing.caption || result.caption || '',
        // Keep the better thumbnail/download URLs
        thumbnail_url: (result as any).thumbnail_url || existing.thumbnail_url,
        download_url: (result as any).download_url || existing.download_url,
        public_url: (result as any).public_url || existing.public_url
      } as any);
    } else {
      // Add new Dropbox result
      pathMap.set(normalizedPath, {
        ...result,
        source: 'dropbox' as const
      });
    }
  });
  
  // Convert back to array and sort by relevance
  const merged = Array.from(pathMap.values()).sort((a, b) => {
    const scoreA = a.composite_score || a.similarity || 0;
    const scoreB = b.composite_score || b.similarity || 0;
    return scoreB - scoreA;
  });
  
  console.log(`🔄 Merged results: ${vectorResults.length} vector + ${dropboxResults.length} dropbox = ${merged.length} total (${duplicateCount.removed} duplicates merged)`);
  
  return merged;
}

/**
 * Apply filters to search results
 */
function applyFilters(
  results: Array<SearchResult & { source: 'vector' | 'dropbox' | 'hybrid' }>, 
  filters: HybridSearchOptions['filters'] = {}
): Array<SearchResult & { source: 'vector' | 'dropbox' | 'hybrid' }> {
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
      return filters.tags!.some(filterTag => 
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

/**
 * Perform hybrid search combining vector and Dropbox search
 */
export async function hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult> {
  const startTime = Date.now();
  const { query, max_results = 50, search_mode = 'hybrid', include_videos = false, filters = {} } = options;
  
  console.log(`🔍 Hybrid search: "${query}" (mode: ${search_mode}, max: ${max_results})`);
  
  if (!query.trim()) {
    return {
      files: [],
      has_more: false,
      total_found: 0,
      processing_time: Date.now() - startTime,
      search_strategy: 'empty_query',
      debug: { vector_results: 0, dropbox_results: 0, merged_results: 0, duplicate_removal: 0 }
    };
  }
  
  let vectorResults: SearchResult[] = [];
  let dropboxResults: Array<SearchResult & { source: 'dropbox' }> = [];
  let searchStrategy = 'unknown';
  
  try {
    // Parallel search execution based on mode
    if (search_mode === 'vector' || search_mode === 'hybrid') {
      console.log('🎯 Executing vector search...');
      try {
        vectorResults = await advancedSearchVectors({
          query,
          className: 'DropboxFile',
          limit: max_results,
          offset: 0,
          certainty: 0.7,
          useAdvanced: true
        });
        
        if (vectorResults.length === 0) {
          console.log('🔄 Advanced vector search returned no results, trying fallback...');
          vectorResults = await fallbackSearch({
            query,
            className: 'DropboxFile',
            limit: max_results,
            offset: 0
          });
        }
      } catch (error) {
        console.error('❌ Vector search failed:', error);
        vectorResults = [];
      }
    }
    
    if (search_mode === 'dropbox' || search_mode === 'hybrid') {
      console.log('🗂️ Executing Dropbox search...');
      try {
        if (include_videos) {
          const videoResults = await searchVideosV2(query, { max_results });
          dropboxResults = normalizeDropboxResults(
            videoResults.matches.map(match => ({
              id: match.metadata.path_lower,
              name: match.metadata.name,
              path: match.metadata.path_display,
              size: match.metadata.size,
              modified: match.metadata.client_modified,
              highlights: match.highlight_spans?.map(span => span.highlight_str) || []
            })),
            query
          );
        } else {
          const mediaResults = await searchMediaWithThumbnails(query, { max_results });
          dropboxResults = normalizeDropboxResults(mediaResults.files, query);
        }
      } catch (error) {
        console.error('❌ Dropbox search failed:', error);
        dropboxResults = [];
      }
    }
    
    // Determine search strategy
    if (search_mode === 'vector') {
      searchStrategy = 'vector_only';
    } else if (search_mode === 'dropbox') {
      searchStrategy = 'dropbox_only';
    } else {
      searchStrategy = 'hybrid_parallel';
    }
    
    // Merge results if hybrid mode
    let mergedResults: Array<SearchResult & { source: 'vector' | 'dropbox' | 'hybrid' }>;
    
    if (search_mode === 'hybrid') {
      mergedResults = mergeSearchResults(vectorResults, dropboxResults, query);
    } else if (search_mode === 'vector') {
      mergedResults = vectorResults.map(r => ({ ...r, source: 'vector' as const }));
    } else {
      mergedResults = dropboxResults;
    }
    
    // Apply filters
    const filteredResults = applyFilters(mergedResults, filters);
    
    // Limit results
    const finalResults = filteredResults.slice(0, max_results);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[HYBRID] Search completed in ${processingTime}ms`);
    console.log(`📊 Results: ${vectorResults.length} vector + ${dropboxResults.length} dropbox = ${finalResults.length} final`);
    
    return {
      files: finalResults,
      has_more: filteredResults.length > max_results,
      total_found: filteredResults.length,
      processing_time: processingTime,
      search_strategy: searchStrategy,
      debug: {
        vector_results: vectorResults.length,
        dropbox_results: dropboxResults.length,
        merged_results: mergedResults.length,
        duplicate_removal: vectorResults.length + dropboxResults.length - mergedResults.length
      }
    };
    
  } catch (error) {
    console.error('[HYBRID] Search error:', error);
    return {
      files: [],
      has_more: false,
      total_found: 0,
      processing_time: Date.now() - startTime,
      search_strategy: 'error',
      debug: { vector_results: 0, dropbox_results: 0, merged_results: 0, duplicate_removal: 0 }
    };
  }
}

/**
 * Search videos specifically using hybrid approach
 */
export async function hybridVideoSearch(options: Omit<HybridSearchOptions, 'include_videos'>): Promise<HybridSearchResult> {
  return hybridSearch({
    ...options,
    include_videos: true
  });
}

/**
 * Cursor-based pagination for hybrid search
 */
export async function hybridSearchWithCursor(options: HybridSearchOptions): Promise<HybridSearchResult> {
  // For now, we'll implement offset-based pagination since vector search doesn't support cursors
  // In a future update, we could store search state and implement true cursor-based pagination
  console.log('[HYBRID] Cursor-based pagination not yet implemented, using offset-based approach');
  return hybridSearch(options);
}