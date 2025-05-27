import { Dropbox, DropboxResponse, files } from 'dropbox';

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
    this.appKey = import.meta.env.VITE_DROPBOX_APP_KEY || '';
    this.appSecret = import.meta.env.VITE_DROPBOX_APP_SECRET || '';
    this.refreshToken = import.meta.env.VITE_DROPBOX_REFRESH_TOKEN || '';

    if (!this.appKey || !this.appSecret || !this.refreshToken) {
      console.error('Missing required environment variables');
    }

    // Initialize Dropbox client
    this.initializeClient().catch(error => {
      console.error('Failed to initialize Dropbox client:', error);
    });
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

  private async getDropboxClient(): Promise<Dropbox> {
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

  private isDateInRange(date: string, filter: DateFilter): boolean {
    const fileDate = new Date(date);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (filter) {
      case 'today':
        return fileDate >= startOfDay;
      case 'this_week':
        return fileDate >= startOfWeek;
      case 'this_month':
        return fileDate >= startOfMonth;
      case 'last_month':
        return fileDate >= startOfLastMonth && fileDate <= endOfLastMonth;
      case 'this_year':
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

  async searchFiles({ query, mediaType = 'all', dateFilter = 'all', cursor }: SearchOptions): Promise<SearchResponse> {
    if (!query?.trim()) {
      console.log('Empty search query, returning empty results');
      return { files: [], hasMore: false, cursor: null, total: 0 };
    }

    try {
      console.log('Starting search with:', { query, mediaType, dateFilter, cursor });
      
      // Validate credentials
      if (!this.appKey || !this.appSecret || !this.refreshToken) {
        console.error('Missing Dropbox credentials:', {
          appKey: this.appKey ? 'present' : 'missing',
          appSecret: this.appSecret ? 'present' : 'missing',
          refreshToken: this.refreshToken ? 'present' : 'missing'
        });
        throw new Error('Missing Dropbox credentials');
      }

      const searchStartTime = performance.now();
      
      let searchResponse;
      if (cursor) {
        console.log('Continuing search with cursor:', cursor);
        searchResponse = await this.handleApiCall<files.SearchV2Result>(async (client) => {
          return await client.filesSearchContinueV2({ cursor });
        });
      } else {
        console.log('Starting new search with query:', query);
        const searchOptions = {
          query,
          options: {
            path: '',
            max_results: 50,
            file_status: { '.tag': 'active' as const },
            filename_only: false,
            file_categories: mediaType === 'all' 
              ? [{ '.tag': 'image' }, { '.tag': 'video' }]
              : mediaType === 'images' 
                ? [{ '.tag': 'image' }]
                : [{ '.tag': 'video' }]
          }
        };
        console.log('Search options:', JSON.stringify(searchOptions, null, 2));
        
        searchResponse = await this.handleApiCall<files.SearchV2Result>(async (client) => {
          return await client.filesSearchV2(searchOptions);
        });
      }

      const searchEndTime = performance.now();
      console.log(`Search API call took ${((searchEndTime - searchStartTime) / 1000).toFixed(2)}s`);

      if (!searchResponse) {
        throw new Error('No response received from Dropbox API');
      }

      const matches = searchResponse.matches || [];
      console.log(`Found ${matches.length} initial matches`);
      
      const files: FileType[] = [];

      for (const match of matches) {
        if (match.metadata['.tag'] === 'metadata' && match.metadata.metadata['.tag'] === 'file') {
          const metadata = match.metadata.metadata;
          const isVideo = this.isVideoFile(metadata.name);
          
          // Skip if we're filtering by type and this doesn't match
          if ((mediaType === 'images' && isVideo) || (mediaType === 'videos' && !isVideo)) {
            continue;
          }

          // Skip if the file doesn't match the date filter
          if (!this.isDateInRange(metadata.server_modified, dateFilter)) {
            continue;
          }

          files.push({
            id: metadata.id,
            path: metadata.path_display || metadata.path_lower || '',
            name: metadata.name,
            isVideo,
            thumbnailUrl: '', // Will be populated by getThumbnailsBatch
            serverModified: metadata.server_modified,
            size: metadata.size || 0
          });
        }
      }

      console.log(`Filtered to ${files.length} matching files`);

      let filesWithThumbnails = files;
      if (files.length > 0) {
        const thumbnailStartTime = performance.now();
        filesWithThumbnails = await this.getThumbnailsBatch(files);
        const thumbnailEndTime = performance.now();
        console.log(`Thumbnail generation took ${((thumbnailEndTime - thumbnailStartTime) / 1000).toFixed(2)}s`);
      }

      return {
        files: filesWithThumbnails,
        hasMore: searchResponse.has_more || false,
        cursor: searchResponse.cursor || null,
        total: cursor ? undefined : matches.length
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  async continueSearch(cursor: string): Promise<SearchResponse> {
    if (!cursor) {
      throw new Error('Cursor is required for continuing search');
    }

    try {
      const searchResponse = await this.handleApiCall(async (client) => {
        return await client.filesSearchContinueV2({ cursor });
      });

      const matches = searchResponse.matches || [];
      const files: FileType[] = [];

      for (const match of matches) {
        const metadata = match.metadata.metadata;
        if (metadata['.tag'] === 'file') {
          const isVideo = this.isVideoFile(metadata.path_lower || '');
          files.push({
            id: metadata.id,
            path: metadata.path_lower || '',
            name: metadata.name,
            isVideo,
            thumbnailUrl: '', // Will be populated by getThumbnailsBatch
            serverModified: metadata.server_modified,
            size: metadata.size || 0
          });
        }
      }

      let filesWithThumbnails = files;
      if (files.length > 0) {
        filesWithThumbnails = await this.getThumbnailsBatch(files);
      }

      return {
        files: filesWithThumbnails,
        hasMore: searchResponse.has_more || false,
        cursor: searchResponse.cursor || null
      };
    } catch (error) {
      console.error('Continue search failed:', error);
      throw error;
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
