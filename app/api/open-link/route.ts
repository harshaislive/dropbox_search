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

    const link = await dropboxClient.getTemporaryLink(path);
    return NextResponse.json({ link });
  } catch (error: unknown) {
    console.error('Open link API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create temporary link';

    return NextResponse.json(
      { error: 'OPEN_LINK_FAILED', message },
      { status: 500 }
    );
  }
}
