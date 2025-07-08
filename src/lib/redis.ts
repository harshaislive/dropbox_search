import Redis from 'ioredis';

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    try {
      console.log('🔄 Initializing Redis connection...');
      
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.error('❌ Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000); // Exponential backoff
        },
        connectTimeout: 10000,
        disconnectTimeout: 2000,
        lazyConnect: true, // Don't connect until first use
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
      });

      redis.on('ready', () => {
        console.log('✅ Redis ready to accept commands');
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      redis = null;
    }
  }
  
  return redis;
}

// Cache key generators
export const CacheKeys = {
  searchResults: (query: string, mediaType: string, page: number) => 
    `search:${query}:${mediaType}:page${page}`,
  
  allSearchResults: (query: string, mediaType: string) => 
    `search:all:${query}:${mediaType}`,
  
  thumbnailUrl: (path: string) => 
    `thumbnail:${path}`,
  
  downloadUrl: (path: string) => 
    `download:${path}`,
  
  searchCursor: (query: string, mediaType: string, page: number) =>
    `cursor:${query}:${mediaType}:page${page}`,
};

// Cache TTLs (in seconds)
export const CacheTTL = {
  searchResults: 3600,      // 1 hour for search results
  allSearchResults: 1800,   // 30 minutes for complete result sets
  thumbnailUrl: 86400,      // 24 hours for thumbnail URLs
  downloadUrl: 86400,       // 24 hours for download URLs
  searchCursor: 3600,       // 1 hour for search cursors
};

// Helper functions for caching
export async function getCachedData<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    if (data) {
      console.log(`📦 Cache hit: ${key}`);
      return JSON.parse(data);
    }
    console.log(`📭 Cache miss: ${key}`);
    return null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCachedData<T>(
  key: string, 
  data: T, 
  ttl: number = 3600
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  
  try {
    await client.setex(key, ttl, JSON.stringify(data));
    console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

// Batch operations for performance
export async function getCachedBatch<T>(
  keys: string[]
): Promise<Map<string, T>> {
  const client = getRedisClient();
  const results = new Map<string, T>();
  
  if (!client || keys.length === 0) return results;
  
  try {
    const values = await client.mget(...keys);
    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        try {
          results.set(key, JSON.parse(value));
        } catch (e) {
          console.error(`Failed to parse cached value for ${key}`);
        }
      }
    });
    
    const hitRate = (results.size / keys.length * 100).toFixed(1);
    console.log(`📦 Batch cache: ${results.size}/${keys.length} hits (${hitRate}%)`);
  } catch (error) {
    console.error('Redis batch get error:', error);
  }
  
  return results;
}

export async function setCachedBatch<T>(
  items: Array<{ key: string; value: T; ttl?: number }>
): Promise<void> {
  const client = getRedisClient();
  if (!client || items.length === 0) return;
  
  try {
    const pipeline = client.pipeline();
    
    items.forEach(({ key, value, ttl = 3600 }) => {
      pipeline.setex(key, ttl, JSON.stringify(value));
    });
    
    await pipeline.exec();
    console.log(`💾 Batch cached: ${items.length} items`);
  } catch (error) {
    console.error('Redis batch set error:', error);
  }
}

// Clear cache by pattern
export async function clearCache(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      const deleted = await client.del(...keys);
      console.log(`🗑️ Cleared ${deleted} cache entries matching: ${pattern}`);
      return deleted;
    }
    return 0;
  } catch (error) {
    console.error('Redis clear cache error:', error);
    return 0;
  }
}

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.ping();
    console.log('✅ Redis ping successful');
    return true;
  } catch (error) {
    console.error('❌ Redis ping failed:', error);
    return false;
  }
}