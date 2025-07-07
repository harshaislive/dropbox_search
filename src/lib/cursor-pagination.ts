import { searchMediaWithThumbnails } from './dropbox';

export interface CursorPaginationOptions {
  query: string;
  page_size: number;
  cursor?: string;
  search_mode?: 'dropbox' | 'vector' | 'hybrid';
  include_videos?: boolean;
}

export interface CursorPaginationResult<T> {
  items: T[];
  next_cursor?: string;
  has_more: boolean;
  total_count?: number;
  page_info: {
    current_page: number;
    page_size: number;
    total_pages?: number;
  };
}

export interface CursorState {
  query: string;
  search_mode: string;
  dropbox_cursor?: string;
  vector_offset?: number;
  page_number: number;
  timestamp: number;
}

/**
 * Encode cursor state to base64 string
 */
export function encodeCursor(state: CursorState): string {
  try {
    const jsonString = JSON.stringify(state);
    return Buffer.from(jsonString, 'utf8').toString('base64');
  } catch (error) {
    console.error('Error encoding cursor:', error);
    return '';
  }
}

/**
 * Decode base64 cursor string to state object
 */
export function decodeCursor(cursor: string): CursorState | null {
  try {
    const jsonString = Buffer.from(cursor, 'base64').toString('utf8');
    const state = JSON.parse(jsonString) as CursorState;
    
    // Validate cursor is not too old (1 hour expiration)
    const now = Date.now();
    const cursorAge = now - state.timestamp;
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    if (cursorAge > maxAge) {
      console.warn('Cursor expired, age:', cursorAge, 'ms');
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Error decoding cursor:', error);
    return null;
  }
}

/**
 * Create initial cursor state
 */
export function createInitialCursor(query: string, search_mode: string = 'hybrid'): CursorState {
  return {
    query,
    search_mode,
    page_number: 1,
    timestamp: Date.now()
  };
}

/**
 * Paginate through Dropbox search results using cursor
 */
export async function paginateDropboxSearch(
  options: CursorPaginationOptions
): Promise<CursorPaginationResult<any>> {
  const { query, page_size, cursor, search_mode = 'dropbox' } = options;
  
  console.log(`[CURSOR] Paginating Dropbox search: "${query}" (cursor: ${cursor ? 'present' : 'none'})`);
  
  let currentCursor: CursorState | null = null;
  let dropboxCursor: string | undefined;
  let currentPage = 1;
  
  // Decode existing cursor if provided
  if (cursor) {
    currentCursor = decodeCursor(cursor);
    if (currentCursor) {
      dropboxCursor = currentCursor.dropbox_cursor;
      currentPage = currentCursor.page_number;
      
      // Verify query matches
      if (currentCursor.query !== query) {
        console.warn('Query mismatch in cursor, starting fresh');
        currentCursor = null;
        dropboxCursor = undefined;
        currentPage = 1;
      }
    }
  }
  
  try {
    // Fetch results from Dropbox
    const searchResult = await searchMediaWithThumbnails(query, {
      max_results: page_size,
      start: dropboxCursor
    });
    
    // Create next cursor state
    let nextCursor: string | undefined;
    if (searchResult.has_more && searchResult.cursor) {
      const nextState: CursorState = {
        query,
        search_mode,
        dropbox_cursor: searchResult.cursor,
        page_number: currentPage + 1,
        timestamp: Date.now()
      };
      nextCursor = encodeCursor(nextState);
    }
    
    const result: CursorPaginationResult<any> = {
      items: searchResult.files,
      next_cursor: nextCursor,
      has_more: searchResult.has_more,
      page_info: {
        current_page: currentPage,
        page_size: page_size,
        total_pages: undefined // Dropbox doesn't provide total count
      }
    };
    
    console.log(`[CURSOR] Dropbox pagination: page ${currentPage}, ${searchResult.files.length} items, has_more: ${searchResult.has_more}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Dropbox pagination error:', error);
    throw error;
  }
}

/**
 * Paginate through hybrid search results (combining vector and Dropbox)
 */
export async function paginateHybridSearch(
  options: CursorPaginationOptions
): Promise<CursorPaginationResult<any>> {
  const { query, page_size, cursor } = options;
  
  console.log(`[CURSOR] Paginating hybrid search: "${query}" (cursor: ${cursor ? 'present' : 'none'})`);
  
  // For hybrid search, we'll use a simpler approach initially
  // since vector search doesn't support native cursor pagination
  
  let currentCursor: CursorState | null = null;
  let vectorOffset = 0;
  let currentPage = 1;
  
  if (cursor) {
    currentCursor = decodeCursor(cursor);
    if (currentCursor && currentCursor.query === query) {
      vectorOffset = currentCursor.vector_offset || 0;
      currentPage = currentCursor.page_number;
    }
  }
  
  try {
    // For hybrid search, we'll implement a combined pagination approach
    // This is a simplified version - in production, you'd want more sophisticated caching
    
    // Calculate offset for vector search
    const vectorPageSize = Math.ceil(page_size / 2); // Split between vector and dropbox
    const dropboxPageSize = page_size - vectorPageSize;
    
    // Get results from both sources
    const [dropboxResult] = await Promise.all([
      searchMediaWithThumbnails(query, {
        max_results: dropboxPageSize,
        start: currentCursor?.dropbox_cursor
      })
    ]);
    
    // Combine results (simplified)
    const combinedItems = [...dropboxResult.files];
    
    // Create next cursor
    let nextCursor: string | undefined;
    if (dropboxResult.has_more) {
      const nextState: CursorState = {
        query,
        search_mode: 'hybrid',
        dropbox_cursor: dropboxResult.cursor,
        vector_offset: vectorOffset + vectorPageSize,
        page_number: currentPage + 1,
        timestamp: Date.now()
      };
      nextCursor = encodeCursor(nextState);
    }
    
    const result: CursorPaginationResult<any> = {
      items: combinedItems.slice(0, page_size),
      next_cursor: nextCursor,
      has_more: dropboxResult.has_more,
      page_info: {
        current_page: currentPage,
        page_size: page_size
      }
    };
    
    console.log(`[CURSOR] Hybrid pagination: page ${currentPage}, ${combinedItems.length} items, has_more: ${dropboxResult.has_more}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Hybrid pagination error:', error);
    throw error;
  }
}

/**
 * Generic cursor-based pagination wrapper
 */
export async function paginateSearch(
  options: CursorPaginationOptions
): Promise<CursorPaginationResult<any>> {
  const { search_mode = 'hybrid' } = options;
  
  switch (search_mode) {
    case 'dropbox':
      return paginateDropboxSearch(options);
    case 'hybrid':
      return paginateHybridSearch(options);
    default:
      throw new Error(`Unsupported search mode: ${search_mode}`);
  }
}

/**
 * Utility to extract cursor from URL search params
 */
export function getCursorFromParams(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('cursor') || undefined;
}

/**
 * Utility to build pagination URLs
 */
export function buildPaginationUrl(
  baseUrl: string, 
  params: Record<string, string | number | boolean>, 
  cursor?: string
): string {
  const url = new URL(baseUrl);
  
  // Add all parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  
  // Add cursor if provided
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  
  return url.toString();
}