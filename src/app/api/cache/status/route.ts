import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, testRedisConnection } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient();
    
    if (!redis) {
      return NextResponse.json({
        status: 'disabled',
        message: 'Redis not configured',
        connected: false
      });
    }

    // Test connection
    const isConnected = await testRedisConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        message: 'Redis connection failed',
        connected: false
      });
    }

    // Get some stats
    const info = await redis.info('stats');
    const dbSize = await redis.dbsize();
    
    // Parse some basic stats
    const stats = {
      connected: true,
      status: 'active',
      database_size: dbSize,
      memory_usage: info.match(/used_memory_human:(.+)/)?.[1]?.trim(),
      total_connections: info.match(/total_connections_received:(.+)/)?.[1]?.trim(),
      total_commands: info.match(/total_commands_processed:(.+)/)?.[1]?.trim(),
      uptime_days: info.match(/uptime_in_days:(.+)/)?.[1]?.trim()
    };

    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Cache status error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      connected: false
    }, { status: 500 });
  }
}