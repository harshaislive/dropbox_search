import { NextRequest, NextResponse } from 'next/server';
import { searchByImageVector, SearchResult } from '@/lib/weaviate';
import { getDropboxThumbnail, generateDropboxDownloadLink } from '@/lib/dropbox';

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

// Function to convert image to CLIP embedding
async function getImageEmbedding(imageFile: File): Promise<number[]> {
  try {
    const formData = new FormData();
    // According to clip.json schema, the field name should be 'file'
    formData.append('file', imageFile, imageFile.name);

    console.log(`🔗 Calling CLIP API: ${process.env.CLIP_API_URL || 'https://clipserver-production.up.railway.app'}/embed/image`);
    console.log(`📤 Uploading file: ${imageFile.name} (${imageFile.size} bytes, type: ${imageFile.type})`);

    const response = await fetch(`${process.env.CLIP_API_URL || 'https://clipserver-production.up.railway.app'}/embed/image`, {
      method: 'POST',
      body: formData,
    });

    console.log(`📥 CLIP API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ CLIP API error response: ${errorText}`);
      throw new Error(`CLIP API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[IMG] Received embedding with ${data.dimensions} dimensions`);
    return data.embedding; // 512-dimensional vector
  } catch (error) {
    console.error('Image embedding error:', error);
    throw error;
  }
}

// Apply filters to search results
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
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const limit = parseInt(formData.get('limit') as string) || 21;
    const offset = parseInt(formData.get('offset') as string) || 0;
    const useAdvanced = formData.get('useAdvanced') === 'true';
    const filtersStr = formData.get('filters') as string;
    
    let filters: SearchFilters = {};
    if (filtersStr) {
      try {
        filters = JSON.parse(filtersStr) as SearchFilters;
      } catch (e) {
        console.warn('Failed to parse filters:', e);
      }
    }

    console.log(`🖼️ Image search API called with limit: ${limit}, offset: ${offset}, advanced: ${useAdvanced}`);

    if (!imageFile) {
      return NextResponse.json({
        results: [],
        totalFound: 0,
        query: 'image_search',
        processingTime: Date.now() - startTime,
        searchStrategy: 'image_search',
        hasMore: false,
        currentPage: 1,
        error: 'No image file provided'
      }, { status: 400 });
    }

    // Get embedding directly from the File object
    console.log(`📸 Processing image: ${imageFile.name} (${imageFile.size} bytes)`);
    
    const imageVector = await getImageEmbedding(imageFile);
    console.log(`🎯 Generated ${imageVector.length}-dimensional embedding`);

    // Search for similar images using vector similarity
    const allSearchResults = await searchByImageVector(imageVector, {
      className: 'DropboxFile',
      limit: 120, // Get more results for filtering
      offset: 0,
      certainty: 0.7,
      useAdvanced
    });

    console.log(`🔍 Found ${allSearchResults.length} similar images`);

    // Apply filters
    const filteredResults = applyFilters(allSearchResults, filters);
    console.log(`🎛️ After filtering: ${filteredResults.length} results`);

    // Sort by similarity if no other sort specified
    if (!filters.sortBy || filters.sortBy === 'relevance') {
      filteredResults.sort((a, b) => {
        const scoreA = a.composite_score || a.similarity || 0;
        const scoreB = b.composite_score || b.similarity || 0;
        return scoreB - scoreA;
      });
    }

    // Paginate results
    const startIndex = offset;
    const endIndex = offset + limit;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);
    
    console.log(`[IMG] Returning page ${Math.floor(offset / limit) + 1}: results ${startIndex + 1}-${Math.min(endIndex, filteredResults.length)} of ${filteredResults.length}`);

    // Enhance results with fresh Dropbox URLs
    const enhancedResults = await Promise.all(
      paginatedResults.map(async (result) => {
        try {
          const [thumbnailUrl, downloadUrl] = await Promise.all([
            getDropboxThumbnail(result.dropbox_path).catch(() => null),
            generateDropboxDownloadLink(result.dropbox_path).catch(() => null)
          ]);

          return {
            ...result,
            thumbnail_url: thumbnailUrl || result.thumbnail_url || undefined,
            download_url: downloadUrl || undefined,
            public_url: downloadUrl || result.public_url || undefined,
            similarity_percentage: Math.round(Math.min(100, ((result.composite_score || result.similarity) || 0) * 100)),
            search_source: 'vector',
            enhanced: true
          };
        } catch (error) {
          console.error(`⚠️ Error enhancing result for ${result.dropbox_path}:`, error);
          return {
            ...result,
            similarity_percentage: Math.round(Math.min(100, ((result.composite_score || result.similarity) || 0) * 100)),
            search_source: 'vector',
            enhanced: false
          };
        }
      })
    );

    const processingTime = Date.now() - startTime;
    const hasMore = (offset + enhancedResults.length) < filteredResults.length;
    
    const response: SearchResponse = {
      results: enhancedResults,
      totalFound: filteredResults.length,
      query: `image_search_${imageFile.name}`,
      processingTime,
      searchStrategy: 'image_search',
      hasMore,
      currentPage: Math.floor(offset / limit) + 1,
      debug: {
        vectorResults: enhancedResults.length,
        textResults: 0,
        uniqueResults: enhancedResults.length,
      }
    };

    console.log(`✨ Image search completed in ${processingTime}ms, returning ${enhancedResults.length} results`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[IMG] Error in image search:', error);
    return NextResponse.json({
      results: [],
      totalFound: 0,
      query: 'image_search',
      processingTime: Date.now() - startTime,
      searchStrategy: 'image_search',
      hasMore: false,
      currentPage: 1,
      error: error instanceof Error ? error.message : 'Image search failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Image search endpoint - use POST with multipart/form-data',
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    maxFileSize: '10MB'
  });
} 