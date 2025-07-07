import { NextRequest, NextResponse } from 'next/server';
import { getWeaviateClient, SearchResult } from '@/lib/weaviate';
import { getDropboxThumbnail, generateDropboxDownloadLink } from '@/lib/dropbox';

interface RecentImagesResponse {
  results: SearchResult[];
  totalFound: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  processingTime: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log(`🕒 Recent Images API called with page: ${page}, limit: ${limit}, offset: ${offset}`);

    const client = getWeaviateClient();

    // Query Weaviate for recent images, sorted by modified_date or processed_date
    const result = await client.graphql
      .get()
      .withClassName('DropboxFile')
      .withFields(`
        dropbox_path
        file_name
        caption
        tags
        file_type
        file_size
        file_extension
        modified_date
        processed_date
        public_url
        thumbnail_url
        content_hash
      `)
      .withLimit(500) // Get up to 500 recent images
      .do();

    if (!result.data?.Get?.DropboxFile) {
      return NextResponse.json({
        results: [],
        totalFound: 0,
        currentPage: page,
        totalPages: 0,
        hasMore: false,
        processingTime: Date.now() - startTime,
      });
    }

    // Convert and sort results by date
    let allResults: SearchResult[] = result.data.Get.DropboxFile.map((file: any) => ({
      id: file.content_hash || file.dropbox_path,
      dropbox_path: file.dropbox_path,
      file_name: file.file_name,
      caption: file.caption,
      tags: file.tags || [],
      similarity: 1, // Not applicable for recent images
      public_url: file.public_url,
      thumbnail_url: file.thumbnail_url,
      file_type: file.file_type,
      file_size: file.file_size,
      file_extension: file.file_extension,
      modified_date: file.modified_date,
      processed_date: file.processed_date,
      source: 'recent' as const,
      enhanced: false,
      metadata: {}
    }));

    // Sort by most recent first (modified_date or processed_date)
    allResults.sort((a, b) => {
      const dateA = new Date(a.modified_date || a.processed_date || 0);
      const dateB = new Date(b.modified_date || b.processed_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply pagination
    const totalFound = allResults.length;
    const totalPages = Math.ceil(totalFound / limit);
    const paginatedResults = allResults.slice(offset, offset + limit);
    const hasMore = offset + limit < totalFound;

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
            thumbnail_url: thumbnailUrl || result.thumbnail_url,
            download_url: downloadUrl,
            enhanced: true
          };
        } catch (error) {
          console.error(`Error enhancing result for ${result.dropbox_path}:`, error);
          return result;
        }
      })
    );

    console.log(`[RECENT] Retrieved ${enhancedResults.length} recent images (page ${page}/${totalPages})`);

    return NextResponse.json({
      results: enhancedResults,
      totalFound,
      currentPage: page,
      totalPages,
      hasMore,
      processingTime: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Error fetching recent images:', error);
    return NextResponse.json(
      {
        results: [],
        totalFound: 0,
        currentPage: 1,
        totalPages: 0,
        hasMore: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'An error occurred'
      },
      { status: 500 }
    );
  }
} 