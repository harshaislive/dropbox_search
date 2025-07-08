import { NextRequest, NextResponse } from 'next/server';
import { clearCache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pattern = '*' } = body;

    // Security: Only allow specific patterns
    const allowedPatterns = [
      'search:*',      // All search results
      'thumbnail:*',   // All thumbnails
      'download:*',    // All download URLs
      'cursor:*',      // All search cursors
      '*'              // All cache (use with caution)
    ];

    if (!allowedPatterns.includes(pattern) && !pattern.startsWith('search:')) {
      return NextResponse.json({
        error: 'Invalid cache pattern'
      }, { status: 400 });
    }

    const deletedCount = await clearCache(pattern);

    return NextResponse.json({
      success: true,
      pattern,
      deleted: deletedCount,
      message: `Cleared ${deletedCount} cache entries`
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to clear cache'
    }, { status: 500 });
  }
}