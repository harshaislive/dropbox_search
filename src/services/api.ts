import { Dropbox, DropboxResponse, files } from 'dropbox';
import { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN, validateRequiredEnv } from '../config/env';

// Types
export interface FileType {
  id: string;
  path: string;
  name: string;
  isVideo: boolean;
  thumbnailUrl: string;
  serverModified: string;
  size: number;
}

export type MediaType = 'all' | 'images' | 'videos';
export type DateFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all';

export interface SearchOptions {
  query: string;
  mediaType?: MediaType;
  dateFilter?: DateFilter;
  cursor?: string | null;
}

export interface SearchResponse {
  files: FileType[];
  hasMore: boolean;
  cursor: string | null;
  total?: number;
}

export class DropboxService {
  private dropbox: Dropbox | null = null;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly refreshToken: string;
  private accessToken: string | null = null;

  constructor() {
    // Validate environment variables on initialization
    const validation = validateRequiredEnv();
    
    this.appKey = DROPBOX_APP_KEY;
    this.appSecret = DROPBOX_APP_SECRET;
    this.refreshToken = DROPBOX_REFRESH_TOKEN;

    if (!validation.isValid) {
      console.error('❌ Missing required Dropbox environment variables:', validation.missing);
      console.error('📋 Please set these variables in Railway dashboard:');
      validation.missing.forEach(variable => {
        console.error(`   • ${variable}`);
      });
      // Don't throw error here, let the app handle it gracefully
    } else {
      console.log('✅ Dropbox environment variables configured correctly');
      // Initialize Dropbox client
      this.initializeClient().catch(error => {
        console.error('Failed to initialize Dropbox client:', error);
      });
    }
  }

  private async initializeClient(): Promise<void> {
    try {
      if (!this.accessToken) {
        console.log('Getting new access token...');
        this.accessToken = await this.refreshAccessToken();
        console.log('Got new access token');
      }

      if (!this.dropbox) {
        console.log('Creating new Dropbox client...');
        this.dropbox = new Dropbox({ accessToken: this.accessToken });
        console.log('Dropbox client created successfully');
      }
    } catch (error) {
      console.error('Failed to initialize client:', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.appKey || !this.appSecret || !this.refreshToken) {
      throw new Error('Missing Dropbox credentials. Please check your environment variables.');
    }

    try {
      console.log('Refreshing access token with credentials:', {
        appKey: this.appKey ? 'present' : 'missing',
        appSecret: this.appSecret ? 'present' : 'missing',
        refreshToken: this.refreshToken ? 'present' : 'missing'
      });

      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.appKey,
          client_secret: this.appSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        if (response.status === 400) {
          throw new Error('Invalid Dropbox credentials. Please check your VITE_DROPBOX_APP_KEY, VITE_DROPBOX_APP_SECRET, and VITE_DROPBOX_REFRESH_TOKEN in Railway.');
        }
        
        throw new Error(`Failed to refresh access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Successfully refreshed access token');
      return data.access_token;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  // Check if service is properly configured
  public isConfigured(): boolean {
    return !!(this.appKey && this.appSecret && this.refreshToken);
  }

  // Get configuration status for UI
  public getConfigurationStatus() {
    return {
      configured: this.isConfigured(),
      missing: {
        appKey: !this.appKey,
        appSecret: !this.appSecret,
        refreshToken: !this.refreshToken,
      }
    };
  }

  private async getDropboxClient(): Promise<Dropbox> {
    if (!this.isConfigured()) {
      throw new Error('Dropbox service is not properly configured. Please check your environment variables.');
    }

    try {
      if (!this.accessToken) {
        console.log('Getting new access token...');
        this.accessToken = await this.refreshAccessToken();
        console.log('Got new access token');
      }

      if (!this.dropbox) {
        console.log('Creating new Dropbox client...');
        this.dropbox = new Dropbox({ accessToken: this.accessToken });
      }

      return this.dropbox;
    } catch (error) {
      console.error('Failed to get Dropbox client:', error);
      throw error;
    }
  }

  private async handleApiCall<T>(apiCall: (client: Dropbox) => Promise<DropboxResponse<T>>): Promise<T> {
    const executeWithRetry = async (retryCount = 0): Promise<T> => {
      try {
        console.log('Getting Dropbox client...');
        const client = await this.getDropboxClient();
        console.log('Got Dropbox client, making API call...');
        const response = await apiCall(client);
        console.log('API call successful');
        return response.result;
      } catch (error: any) {
        console.error('API call failed:', error);
        console.error('Error details:', {
          status: error?.status,
          message: error?.message,
          error: error?.error,
          errorSummary: error?.error?.error_summary
        });

        if (error?.status === 401 && retryCount < 1) {
          console.log('Token expired, refreshing...');
          // Invalidate both token and client
          this.accessToken = null;
          this.dropbox = null;
          // Retry the operation with refreshed token
          return executeWithRetry(retryCount + 1);
        }
        throw error;
      }
    };
    return executeWithRetry();
  }

  // Supported file extensions for images and videos
  private readonly SUPPORTED_EXTENSIONS = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.raw', '.heic'],
    videos: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp']
  };

  private isVideoFile(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return this.SUPPORTED_EXTENSIONS.videos.includes(extension);
  }

  private isDateInRange(dateStr: string, filter: DateFilter): boolean {
    if (filter === 'all') return true;

    const fileDate = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        const fileDateOnly = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());
        return fileDateOnly.getTime() === today.getTime();

      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return fileDate >= startOfWeek;

      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return fileDate >= startOfMonth;

      case 'last_month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return fileDate >= startOfLastMonth && fileDate <= endOfLastMonth;

      case 'this_year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return fileDate >= startOfYear;

      default:
        return true;
    }
  }

  private async getThumbnailsBatch(files: FileType[]): Promise<FileType[]> {
    if (files.length === 0) return [];

    const BATCH_SIZE = 25; // Dropbox's maximum batch size
    const batches: FileType[][] = [];
    
    // Split files into batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    const processedFiles = [...files];

    for (let batch of batches) {
      try {
        console.log('Requesting thumbnails for batch:', batch.length);
        
        // Only request thumbnails for supported files
        const entries = batch
          .filter(file => {
            const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
            return [
              ...this.SUPPORTED_EXTENSIONS.images,
              ...this.SUPPORTED_EXTENSIONS.videos
            ].includes(extension);
          })
          .map(file => ({
            path: file.path,
            format: { '.tag': 'jpeg' as const },
            size: { '.tag': 'w640h480' as const },
            mode: { '.tag': this.isVideoFile(file.name) ? 'strict' as const : 'bestfit' as const }
          }));

        if (entries.length === 0) continue;

        const response = await this.handleApiCall(async (client) => {
          return await client.filesGetThumbnailBatch({ entries });
        });

        // Process thumbnails
        response.entries.forEach((entry, index) => {
          const originalIndex = files.findIndex(f => f.path === batch[index].path);
          if (originalIndex === -1) return;

          if (entry['.tag'] === 'success' && entry.thumbnail) {
            try {
              const base64String = entry.thumbnail;
              const blob = this.base64ToBlob(base64String);
              // Revoke previous URL if it exists
              if (processedFiles[originalIndex].thumbnailUrl) {
                URL.revokeObjectURL(processedFiles[originalIndex].thumbnailUrl);
              }
              processedFiles[originalIndex].thumbnailUrl = URL.createObjectURL(blob);
            } catch (error) {
              console.warn('Failed to process thumbnail for:', batch[index].path, error);
              // Keep the file but without a thumbnail
              processedFiles[originalIndex].thumbnailUrl = '';
            }
          } else {
            console.warn('No thumbnail available for:', batch[index].path);
            // Keep the file but without a thumbnail
            processedFiles[originalIndex].thumbnailUrl = '';
          }
        });

        // Add a small delay between batches to avoid rate limits
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error('Error getting thumbnails for batch:', error);
        // Continue processing other batches even if one fails
      }
    }

    return processedFiles;
  }

  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: 'image/jpeg' });
  }

  private async searchFiles(query: string, cursor?: string | null): Promise<{ files: any[], cursor: string | null, hasMore: boolean }> {
    const dropbox = await this.getDropboxClient();
    
    try {
      const searchOptions = {
        query,
        options: {
          path: '',
          max_results: 100,
          file_status: { '.tag': 'active' as const },
          filename_only: false,
          file_categories: [
            { '.tag': 'image' as const },
            { '.tag': 'video' as const }
          ]
        }
      };

      let result: DropboxResponse<files.SearchV2Result>;
      
      if (cursor) {
        result = await dropbox.filesSearchContinueV2({ cursor });
      } else {
        result = await dropbox.filesSearchV2(searchOptions);
      }

      const files = result.result.matches.map((match: any) => {
        // Type assertion for metadata access
        const metadata = match.metadata?.metadata || match.metadata;
        
        return {
          id: metadata.id,
          name: metadata.name,
          path: metadata.path_lower,
          serverModified: metadata.server_modified,
          size: metadata.size || 0,
          isVideo: this.isVideoFile(metadata.name),
          thumbnailUrl: ''
        };
      });

      return {
        files,
        cursor: result.result.cursor || null,
        hasMore: result.result.has_more
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  public async searchMedia(options: SearchOptions): Promise<SearchResponse> {
    if (!this.isConfigured()) {
      return {
        files: [],
        hasMore: false,
        cursor: null,
        total: 0
      };
    }

    try {
      const searchStart = performance.now();
      const { files, cursor, hasMore } = await this.searchFiles(options.query, options.cursor);
      
      let filteredFiles = files;

      // Apply media type filter
      if (options.mediaType && options.mediaType !== 'all') {
        filteredFiles = files.filter(file => {
          if (options.mediaType === 'images') return !file.isVideo;
          if (options.mediaType === 'videos') return file.isVideo;
          return true;
        });
      }

      // Apply date filter
      if (options.dateFilter && options.dateFilter !== 'all') {
        filteredFiles = filteredFiles.filter(file => 
          this.isDateInRange(file.serverModified, options.dateFilter!)
        );
      }

      // Get thumbnails in batches
      const batchSize = 25;
      const batches: any[][] = [];
      for (let i = 0; i < filteredFiles.length; i += batchSize) {
        const batch = filteredFiles.slice(i, i + batchSize);
        batches.push(batch);
      }

      // Process batches concurrently (limit to 3 concurrent batches)
      const processedFiles: FileType[] = [];
      for (let i = 0; i < batches.length; i += 3) {
        const concurrentBatches = batches.slice(i, i + 3);
        const batchPromises = concurrentBatches.map(async (batch) => {
          return Promise.all(
            batch.map(async (file) => {
              try {
                if (!file.isVideo) {
                  const thumbnail = await this.getThumbnail(file.path);
                  return { ...file, thumbnailUrl: thumbnail };
                }
                return file;
              } catch {
                return file;
              }
            })
          );
        });

        const batchResults = await Promise.all(batchPromises);
        processedFiles.push(...batchResults.flat());
      }

      const searchEnd = performance.now();
      const searchDuration = Math.round(searchEnd - searchStart);
      
      console.log(`Search completed in ${searchDuration}ms`, {
        total: files.length,
        afterFilters: filteredFiles.length,
        mediaType: options.mediaType,
        dateFilter: options.dateFilter
      });

      return {
        files: processedFiles,
        hasMore,
        cursor,
        total: filteredFiles.length
      };
    } catch {
      // Return empty results if not configured or error occurs
      return {
        files: [],
        hasMore: false,
        cursor: null,
        total: 0
      };
    }
  }

  async downloadFile(path: string) {
    return this.handleApiCall(async (client) => {
      return await client.filesDownload({ path });
    }).catch(error => {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file. Please try again.');
    });
  }

  async getFileMetadata(path: string) {
    return this.handleApiCall(async (client) => {
      return await client.filesGetMetadata({ path });
    }).catch(error => {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file information.');
    });
  }

  async getTemporaryLink(path: string): Promise<string> {
    try {
      const response = await this.handleApiCall(async (client) => {
        return await client.filesGetTemporaryLink({ path });
      });
      return response.link;
    } catch (error) {
      console.error('Error getting temporary link:', error);
      throw error;
    }
  }

  async getDownloadLink(path: string): Promise<string> {
    try {
      const response = await this.handleApiCall<files.GetTemporaryLinkResult>(async (client) => {
        return await client.filesGetTemporaryLink({ path });
      });
      console.log('Got download link:', response.link);
      return response.link;
    } catch (error) {
      console.error('Failed to get download link:', error);
      throw error;
    }
  }

  private convertToDirectLink(url: string): string {
    // Remove any existing query parameters and add raw=1
    const baseUrl = url.split('?')[0];
    return baseUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com') + '?raw=1';
  }

  private async getExistingValidLink(path: string): Promise<string | null> {
    try {
      const response = await this.handleApiCall(async (client) => {
        return await client.sharingListSharedLinks({
          path,
          direct_only: true
        });
      });

      if (response.links && response.links.length > 0) {
        // Find the first valid link
        const validLink = response.links.find(link => link.url);
        if (validLink) {
          console.log('Found existing shared link');
          return validLink.url;
        }
      }
      return null;
    } catch (error) {
      console.log('No existing shared links found');
      return null;
    }
  }

  async getVideoLink(path: string): Promise<string> {
    try {
      // Try to get a temporary link first as it's better for streaming
      const response = await this.handleApiCall(async (client) => {
        return await client.filesGetTemporaryLink({ path });
      });

      if (response.link) {
        console.log('Got temporary streaming link:', response.link);
        return response.link;
      }

      throw new Error('Failed to get temporary link');
    } catch (error) {
      console.error('Failed to get video link:', error);
      throw new Error('Could not generate video link. Please try again.');
    }
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

export const dropboxService = new DropboxService();
