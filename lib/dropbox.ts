import { Dropbox } from 'dropbox';
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class DropboxClient {
  private dbx: Dropbox | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
    const appKey = process.env.DROPBOX_APP_KEY;
    const appSecret = process.env.DROPBOX_APP_SECRET;

    // Debug logging for server environment
    console.log('Environment check:', {
      hasRefreshToken: !!refreshToken,
      hasAppKey: !!appKey,
      hasAppSecret: !!appSecret,
      refreshTokenLength: refreshToken?.length || 0,
      appKeyLength: appKey?.length || 0,
      appSecretLength: appSecret?.length || 0
    });

    if (!refreshToken || !appKey || !appSecret) {
      throw new Error(`MISSING_CREDENTIALS: Missing variables - refreshToken: ${!!refreshToken}, appKey: ${!!appKey}, appSecret: ${!!appSecret}`);
    }

    try {
      const response = await axios.post<TokenResponse>(
        'https://api.dropbox.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: appKey,
          client_secret: appSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error: unknown) {
      const err = error as any;
      console.error('Error refreshing access token:', err.response?.data || err.message);
      if (err.response?.status === 400) {
        throw new Error('INVALID_CREDENTIALS: Invalid refresh token or app credentials. Please check your Dropbox app configuration.');
      }
      throw new Error('NETWORK_ERROR: Failed to connect to Dropbox API. Please check your internet connection.');
    }
  }

  async getClient(): Promise<Dropbox> {
    // Check if we need to refresh the token
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      const accessToken = await this.refreshAccessToken();
      
      // Configure Dropbox client with proper fetch for Node.js
      this.dbx = new Dropbox({ 
        accessToken,
        fetch: async (input: any, init?: any) => {
          // Use dynamic import for node-fetch in server environment
          if (typeof window === 'undefined') {
            const { default: nodeFetch } = await import('node-fetch');
            return nodeFetch(input, init) as any;
          }
          // Use browser fetch in client environment
          return fetch(input, init);
        }
      });
    }

    if (!this.dbx) {
      throw new Error('Failed to initialize Dropbox client');
    }

    return this.dbx;
  }

  async searchFiles(query: string, options?: {
    path?: string;
    maxResults?: number;
    fileCategories?: Array<'image' | 'document' | 'pdf' | 'spreadsheet' | 'presentation' | 'audio' | 'video' | 'folder' | 'paper' | 'others'>;
    fileExtensions?: string[];
    cursor?: string;
    orderBy?: 'relevance' | 'last_modified_time';
    filenameOnly?: boolean;
  }) {
    const client = await this.getClient();
    
    // Parse query for type filters (e.g., "coffee type:image")
    let searchQuery = query;
    let typeFilter: string | undefined;
    
    const typeMatch = query.match(/type:(\w+)/i);
    if (typeMatch) {
      typeFilter = typeMatch[1].toLowerCase();
      searchQuery = query.replace(/type:\w+/i, '').trim();
    }

    try {
      if (options?.cursor) {
        // Continue search with cursor
        return await client.filesSearchContinueV2({
          cursor: options.cursor,
        });
      }

      // Validate query - Dropbox requires at least one character or a file extension filter
      if (!searchQuery && !options?.fileExtensions?.length && !typeFilter) {
        throw new Error('Search query cannot be empty. Please provide a search term or file type filter.');
      }

      // If query is empty but we have type filter, use a wildcard
      if (!searchQuery && typeFilter) {
        searchQuery = '*';
      }

      // Map type filter to file categories
      let fileCategories = options?.fileCategories;
      if (typeFilter) {
        switch (typeFilter) {
          case 'image':
          case 'images':
            fileCategories = ['image'];
            break;
          case 'video':
          case 'videos':
            fileCategories = ['video'];
            break;
          case 'document':
          case 'documents':
          case 'doc':
          case 'docs':
            fileCategories = ['document', 'pdf'];
            break;
          case 'pdf':
            fileCategories = ['pdf'];
            break;
        }
      }

      // Start new search - ensure we have valid search parameters
      const searchOptions: any = {
        query: searchQuery || '*', // Use wildcard if no query
        options: {
          max_results: Math.min(options?.maxResults || 20, 100), // Limit to max 100
          order_by: { '.tag': options?.orderBy || 'relevance' },
          filename_only: options?.filenameOnly || false,
        },
      };

      // Only add path if it's provided
      if (options?.path) {
        searchOptions.options.path = options.path;
      }

      if (fileCategories && fileCategories.length > 0) {
        searchOptions.options.file_categories = fileCategories;
      }

      if (options?.fileExtensions && options.fileExtensions.length > 0) {
        searchOptions.options.file_extensions = options.fileExtensions;
      }

      console.log('Dropbox search options:', JSON.stringify(searchOptions, null, 2));
      
      return await client.filesSearchV2(searchOptions);
    } catch (error: any) {
      console.error('Error searching files:', error);
      
      // Provide more specific error messages
      if (error.error?.includes('invalid_argument')) {
        throw new Error('INVALID_SEARCH_PARAMS: Search parameters are invalid. Please check your query and try again.');
      }
      
      throw error;
    }
  }

  async getTemporaryLink(path: string): Promise<string> {
    const client = await this.getClient();
    
    try {
      const response = await client.filesGetTemporaryLink({ path });
      return response.result.link;
    } catch (error) {
      console.error('Error getting temporary link:', error);
      throw error;
    }
  }

  async listFolder(path = '', cursor?: string) {
    const client = await this.getClient();

    try {
      if (cursor) {
        return await client.filesListFolderContinue({ cursor });
      }

      return await client.filesListFolder({
        path,
        include_media_info: true,
        include_mounted_folders: true,
        include_non_downloadable_files: true,
        limit: 100,
      });
    } catch (error) {
      console.error('Error listing folder:', error);
      throw error;
    }
  }

  async getMetadata(path: string) {
    const client = await this.getClient();

    try {
      return await client.filesGetMetadata({
        path,
        include_media_info: true,
        include_has_explicit_shared_members: true,
      });
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw error;
    }
  }

  async downloadFile(path: string): Promise<Blob> {
    const client = await this.getClient();
    
    try {
      const response = await client.filesDownload({ path });
      return (response.result as any).fileBlob;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  async getPreview(path: string): Promise<string> {
    const client = await this.getClient();

    try {
      const response = await client.filesGetPreview({ path });
      const result = response.result as any;
      const fileData = result.fileBinary || result.fileBlob;

      if (!fileData) {
        throw new Error('Preview response did not include file data');
      }

      const buffer = Buffer.isBuffer(fileData)
        ? fileData
        : Buffer.from(await fileData.arrayBuffer());

      return `data:application/octet-stream;base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.error('Error getting preview:', error);
      throw error;
    }
  }

  async getThumbnail(path: string, size: 'w32h32' | 'w64h64' | 'w128h128' | 'w256h256' | 'w480h320' | 'w640h480' | 'w960h640' | 'w1024h768' | 'w2048h1536' = 'w256h256'): Promise<string> {
    const client = await this.getClient();

    try {
      const response = await client.filesGetThumbnailV2({
        resource: {
          '.tag': 'path',
          path,
        },
        format: { '.tag': 'jpeg' },
        size: { '.tag': size },
        mode: { '.tag': 'bestfit' },
      });

      const result = response.result as any;
      const fileData = result.fileBinary || result.fileBlob;

      if (!fileData) {
        throw new Error('Thumbnail response did not include image data');
      }

      const buffer = Buffer.isBuffer(fileData)
        ? fileData
        : Buffer.from(await fileData.arrayBuffer());
      const base64 = buffer.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error: any) {
      console.error('Error getting thumbnail:', error?.error || error);
      throw error;
    }
  }

  async getThumbnailBatch(paths: string[], size: 'w32h32' | 'w64h64' | 'w128h128' | 'w256h256' | 'w480h320' | 'w640h480' | 'w960h640' | 'w1024h768' | 'w2048h1536' = 'w256h256') {
    const client = await this.getClient();
    const requestedPaths = paths.slice(0, 25);

    try {
      const response = await client.filesGetThumbnailBatch({
        entries: requestedPaths.map(path => ({
          path,
          format: { '.tag': 'jpeg' },
          size: { '.tag': size },
          mode: { '.tag': 'bestfit' },
        })),
      } as any);

      const thumbnails: Record<string, string> = {};
      const failures: Record<string, string> = {};

      response.result.entries.forEach((entry: any, index: number) => {
        const fallbackPath = requestedPaths[index];

        if (entry['.tag'] === 'success') {
          const path = entry.metadata.path_display || entry.metadata.path_lower || fallbackPath;
          thumbnails[path] = `data:image/jpeg;base64,${entry.thumbnail}`;
          return;
        }

        failures[fallbackPath] = entry.failure?.['.tag'] || entry['.tag'] || 'unknown';
      });

      return { thumbnails, failures };
    } catch (error) {
      console.error('Error getting thumbnail batch:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dropboxClient = new DropboxClient();
