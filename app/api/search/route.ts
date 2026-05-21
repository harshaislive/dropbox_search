import { NextRequest, NextResponse } from 'next/server';
import { dropboxClient } from '@/lib/dropbox';

const fileCategories = [
  'image',
  'document',
  'pdf',
  'spreadsheet',
  'presentation',
  'audio',
  'video',
  'folder',
  'paper',
  'others',
] as const;

type FileCategory = (typeof fileCategories)[number];

function parseList(value: string | null) {
  return value
    ?.split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean) || [];
}

function transformMetadata(metadata: Record<string, any>, index: number) {
  const uniqueId = metadata.id
    ? `${metadata.id}-${index}`
    : `${(metadata.path_display || metadata.path_lower || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}-${index}-${Date.now()}`;

  const media = metadata.media_info?.metadata;

  return {
    id: uniqueId,
    dropboxId: metadata.id,
    name: metadata.name || 'Unknown',
    path: metadata.path_display || metadata.path_lower || '',
    pathLower: metadata.path_lower || '',
    size: metadata.size,
    isFolder: metadata['.tag'] === 'folder',
    modified: metadata.client_modified || metadata.server_modified || new Date().toISOString(),
    serverModified: metadata.server_modified,
    tag: metadata['.tag'] || 'file',
    extension: metadata.name?.split('.').pop()?.toLowerCase(),
    contentHash: metadata.content_hash,
    dimensions: media?.dimensions,
    mediaType: media?.['.tag'],
    matchType: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const cursor = searchParams.get('cursor');
    const path = searchParams.get('path');
    const maxResults = searchParams.get('maxResults');
    const categories = parseList(searchParams.get('categories'))
      .filter((item): item is FileCategory => fileCategories.includes(item as FileCategory));
    const extensions = parseList(searchParams.get('extensions')).map(ext => ext.replace(/^\./, ''));
    const orderBy = searchParams.get('orderBy') === 'last_modified_time' ? 'last_modified_time' : 'relevance';
    const filenameOnly = searchParams.get('filenameOnly') === 'true';
    const modifiedAfter = searchParams.get('modifiedAfter');
    const modifiedBefore = searchParams.get('modifiedBefore');

    if (!query && !cursor) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Validate query before sending to Dropbox
    if (!cursor && query && query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty query not allowed' },
        { status: 400 }
      );
    }

    const results = await dropboxClient.searchFiles(query || '', {
      cursor: cursor || undefined,
      path: path || undefined,
      maxResults: maxResults ? parseInt(maxResults) : 20,
      fileCategories: categories.length ? categories : undefined,
      fileExtensions: extensions.length ? extensions : undefined,
      orderBy,
      filenameOnly,
    });

    // Check if results exist and have the expected structure
    if (!results || !results.result) {
      return NextResponse.json({
        matches: [],
        hasMore: false,
        cursor: null,
      });
    }

    // Transform the results to a cleaner format
    let matches = results.result.matches?.map((match: Record<string, any>, index: number) => {
      const metadata = match.metadata?.metadata || match.metadata;
      if (!metadata) return null;

      return {
        ...transformMetadata(metadata, index),
        matchType: match.match_type?.['.tag'],
      };
    }).filter(Boolean) || [];

    if (modifiedAfter || modifiedBefore) {
      const afterTime = modifiedAfter ? new Date(modifiedAfter).getTime() : Number.NEGATIVE_INFINITY;
      const beforeTime = modifiedBefore ? new Date(modifiedBefore).getTime() : Number.POSITIVE_INFINITY;

      matches = matches.filter((file: any) => {
        const modifiedTime = new Date(file.serverModified || file.modified).getTime();
        return modifiedTime >= afterTime && modifiedTime <= beforeTime;
      });
    }

    const transformedResults = {
      matches,
      hasMore: results.result.has_more || false,
      cursor: results.result.cursor || null,
    };

    return NextResponse.json(transformedResults);
  } catch (error: unknown) {
    console.error('Search API error:', error);
    
    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('MISSING_CREDENTIALS')) {
      return NextResponse.json(
        { 
          error: 'MISSING_CREDENTIALS',
          message: 'Dropbox credentials not configured. Please set up your API keys in .env.local'
        },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes('INVALID_CREDENTIALS')) {
      return NextResponse.json(
        { 
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid Dropbox credentials. Please check your API keys and refresh token.'
        },
        { status: 401 }
      );
    }

    if (errorMessage.includes('INVALID_SEARCH_PARAMS')) {
      return NextResponse.json(
        { 
          error: 'INVALID_SEARCH_PARAMS',
          message: 'Invalid search parameters. Please check your query and try again.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'SEARCH_FAILED',
        message: 'Failed to search files. Please try again later.'
      },
      { status: 500 }
    );
  }
}
