import { NextRequest, NextResponse } from 'next/server';
import { dropboxClient } from '@/lib/dropbox';

function transformEntry(entry: Record<string, any>) {
  const media = entry.media_info?.metadata;

  return {
    id: entry.id || entry.path_lower || entry.name,
    dropboxId: entry.id,
    name: entry.name || 'Unknown',
    path: entry.path_display || entry.path_lower || '',
    pathLower: entry.path_lower || '',
    size: entry.size,
    isFolder: entry['.tag'] === 'folder',
    modified: entry.client_modified || entry.server_modified || new Date().toISOString(),
    serverModified: entry.server_modified,
    tag: entry['.tag'] || 'file',
    extension: entry.name?.includes('.') ? entry.name.split('.').pop()?.toLowerCase() : undefined,
    contentHash: entry.content_hash,
    dimensions: media?.dimensions,
    mediaType: media?.['.tag'],
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    const cursor = searchParams.get('cursor') || undefined;

    const result = await dropboxClient.listFolder(path, cursor);

    return NextResponse.json({
      entries: result.result.entries.map(transformEntry),
      cursor: result.result.cursor,
      hasMore: result.result.has_more,
    });
  } catch (error: unknown) {
    console.error('Folder API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list folder';

    return NextResponse.json(
      { error: 'FOLDER_LIST_FAILED', message },
      { status: 500 }
    );
  }
}
