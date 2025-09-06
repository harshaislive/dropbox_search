import { NextRequest, NextResponse } from 'next/server';
import { dropboxClient } from '@/lib/dropbox';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const size = searchParams.get('size') as 'w32h32' | 'w64h64' | 'w128h128' | 'w256h256' | 'w480h320' | 'w640h480' | 'w960h640' | 'w1024h768' | 'w2048h1536';

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const thumbnailUrl = await dropboxClient.getThumbnail(path, size || 'w256h256');
    
    return NextResponse.json({ thumbnailUrl });
  } catch (error: unknown) {
    console.error('Thumbnail API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('MISSING_CREDENTIALS')) {
      return NextResponse.json(
        { 
          error: 'MISSING_CREDENTIALS',
          message: 'Dropbox credentials not configured'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'THUMBNAIL_FAILED',
        message: 'Failed to generate thumbnail'
      },
      { status: 500 }
    );
  }
}