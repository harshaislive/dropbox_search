import { NextRequest, NextResponse } from 'next/server';
import { dropboxClient } from '@/lib/dropbox';

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const response = await dropboxClient.getMetadata(path);
    const metadata = response.result as any;
    const media = metadata.media_info?.metadata;

    return NextResponse.json({
      id: metadata.id,
      name: metadata.name,
      path: metadata.path_display || metadata.path_lower,
      size: metadata.size,
      tag: metadata['.tag'],
      extension: metadata.name?.includes('.') ? metadata.name.split('.').pop()?.toLowerCase() : undefined,
      clientModified: metadata.client_modified,
      serverModified: metadata.server_modified,
      contentHash: metadata.content_hash,
      isDownloadable: metadata.is_downloadable,
      hasExplicitSharedMembers: metadata.has_explicit_shared_members,
      dimensions: media?.dimensions,
      mediaType: media?.['.tag'],
      timeTaken: media?.time_taken,
      raw: metadata,
    });
  } catch (error: unknown) {
    console.error('Metadata API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load metadata';

    return NextResponse.json(
      { error: 'METADATA_FAILED', message },
      { status: 500 }
    );
  }
}
