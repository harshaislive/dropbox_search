// HEIC thumbnail processing utilities
// Note: heic2any is dynamically imported to avoid SSR issues

interface ThumbnailCache {
  [key: string]: string; // path -> base64 data URL
}

// In-memory cache for processed thumbnails
const thumbnailCache: ThumbnailCache = {};

// IndexedDB for persistent caching
let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available (server-side)'));
  }

  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('HeicThumbnails', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('thumbnails')) {
        db.createObjectStore('thumbnails');
      }
    };
  });
  
  return dbPromise;
};

const getCachedThumbnail = async (path: string): Promise<string | null> => {
  // Check memory cache first
  if (thumbnailCache[path]) {
    return thumbnailCache[path];
  }
  
  // Check IndexedDB
  try {
    const db = await initDB();
    const transaction = db.transaction(['thumbnails'], 'readonly');
    const store = transaction.objectStore('thumbnails');
    
    return new Promise((resolve) => {
      const request = store.get(path);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          thumbnailCache[path] = result; // Cache in memory too
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.warn('IndexedDB cache access failed:', error);
    return null;
  }
};

const setCachedThumbnail = async (path: string, dataUrl: string): Promise<void> => {
  // Set in memory cache
  thumbnailCache[path] = dataUrl;
  
  // Set in IndexedDB
  try {
    const db = await initDB();
    const transaction = db.transaction(['thumbnails'], 'readwrite');
    const store = transaction.objectStore('thumbnails');
    store.put(dataUrl, path);
  } catch (error) {
    console.warn('IndexedDB cache write failed:', error);
  }
};

// Worker pool for parallel processing
class HeicWorkerPool {
  private maxConcurrent = 3; // Process max 3 HEIC files at once
  private activeJobs = 0;
  private queue: Array<() => Promise<void>> = [];

  async addJob<T>(job: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedJob = async () => {
        try {
          this.activeJobs++;
          const result = await job();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeJobs--;
          this.processQueue();
        }
      };

      if (this.activeJobs < this.maxConcurrent) {
        wrappedJob();
      } else {
        this.queue.push(wrappedJob);
      }
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const nextJob = this.queue.shift();
      if (nextJob) {
        nextJob();
      }
    }
  }
}

const workerPool = new HeicWorkerPool();

export const processHeicThumbnail = async (
  filePath: string, 
  maxWidth: number = 640,
  quality: number = 0.9
): Promise<string> => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('HEIC processing only available in browser environment');
  }

  // Check cache first
  const cached = await getCachedThumbnail(filePath);
  if (cached) {
    return cached;
  }
  
  // Use worker pool for parallel processing
  return workerPool.addJob(async () => {
    try {
      // Get download link from our API
      const response = await fetch(`/api/download?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('Failed to get download link');
      }
      
      const { link } = await response.json();
      
      // Download the HEIC file
      const heicResponse = await fetch(link);
      if (!heicResponse.ok) {
        throw new Error('Failed to download HEIC file');
      }
      
      const heicBlob = await heicResponse.blob();
      
      // Dynamically import heic2any to avoid SSR issues
      const { default: heic2any } = await import('heic2any');
      
      // Convert HEIC to JPEG
      const jpegBlob = await heic2any({
        blob: heicBlob,
        toType: 'image/jpeg',
        quality: quality
      }) as Blob;
      
      // Create thumbnail using Canvas
      const thumbnail = await createThumbnail(jpegBlob, maxWidth);
      
      // Cache the result
      await setCachedThumbnail(filePath, thumbnail);
      
      return thumbnail;
      
    } catch (error) {
      console.error('HEIC processing failed for', filePath, ':', error);
      throw error;
    }
  });
};

// Batch process multiple HEIC files
export const processHeicBatch = async (
  filePaths: string[], 
  maxWidth: number = 640,
  quality: number = 0.9,
  onProgress?: (completed: number, total: number, filePath: string) => void
): Promise<Record<string, string | null>> => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('HEIC batch processing only available in browser environment');
  }

  const results: Record<string, string | null> = {};
  
  // Process all files in parallel using Promise.allSettled
  const promises = filePaths.map(async (filePath, index) => {
    try {
      const thumbnail = await processHeicThumbnail(filePath, maxWidth, quality);
      results[filePath] = thumbnail;
      onProgress?.(index + 1, filePaths.length, filePath);
      return { filePath, thumbnail };
    } catch (error) {
      console.warn('HEIC processing failed for', filePath, error);
      results[filePath] = null;
      onProgress?.(index + 1, filePaths.length, filePath);
      return { filePath, thumbnail: null };
    }
  });

  await Promise.allSettled(promises);
  return results;
};

const createThumbnail = (blob: Blob, maxWidth: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Canvas not available (server-side)'));
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      // Calculate thumbnail dimensions
      const aspectRatio = img.height / img.width;
      const width = Math.min(img.width, maxWidth);
      const height = width * aspectRatio;
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
      
      // Cleanup
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(blob);
  });
};

export const isHeicFile = (extension?: string): boolean => {
  const ext = extension?.toLowerCase();
  return ['heic', 'heif'].includes(ext || '');
};

export const clearThumbnailCache = (): void => {
  // Clear memory cache
  Object.keys(thumbnailCache).forEach(key => delete thumbnailCache[key]);
  
  // Clear IndexedDB cache
  initDB().then(db => {
    const transaction = db.transaction(['thumbnails'], 'readwrite');
    const store = transaction.objectStore('thumbnails');
    store.clear();
  }).catch(error => {
    console.warn('Failed to clear IndexedDB cache:', error);
  });
};