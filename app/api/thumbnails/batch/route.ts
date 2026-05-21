import { NextRequest, NextResponse } from 'next/server';
import { dropboxClient } from '@/lib/dropbox';

const sizes = [
  'w32h32',
  'w64h64',
  'w128h128',
  'w256h256',
  'w480h320',
  'w640h480',
  'w960h640',
  'w1024h768',
  'w2048h1536',
] as const;

type ThumbnailSize = (typeof sizes)[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const paths = Array.isArray(body.paths) ? body.paths.filter(Boolean) : [];
    const requestedSize = sizes.includes(body.size) ? body.size as ThumbnailSize : 'w256h256';

    if (!paths.length) {
      return NextResponse.json(
        { error: 'At least one path is required' },
        { status: 400 }
      );
    }

    const result = await dropboxClient.getThumbnailBatch(paths, requestedSize);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Batch thumbnail API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load thumbnails';

    return NextResponse.json(
      { error: 'BATCH_THUMBNAILS_FAILED', message },
      { status: 500 }
    );
  }
}
