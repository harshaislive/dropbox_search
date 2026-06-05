import { NextRequest, NextResponse } from 'next/server';
import { dropboxClient } from '@/lib/dropbox';

const videoExtensions = new Set(['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv']);

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const extension = path.split('.').pop()?.toLowerCase();
    if (extension && videoExtensions.has(extension)) {
      const link = await dropboxClient.getTemporaryLink(path);
      return NextResponse.json({ previewUrl: link, source: 'temporary_link' });
    }

    try {
      const previewUrl = await dropboxClient.getPreview(path);
      return NextResponse.json({ previewUrl, source: 'preview' });
    } catch {
      const link = await dropboxClient.getTemporaryLink(path);
      return NextResponse.json({ previewUrl: link, source: 'temporary_link' });
    }
  } catch (error: unknown) {
    console.error('Preview API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load preview';

    return NextResponse.json(
      { error: 'PREVIEW_FAILED', message },
      { status: 500 }
    );
  }
}
